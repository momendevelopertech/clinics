import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  sendSMS,
  sendEmail,
  sendWhatsApp,
  renderAppointmentReminder,
} from "@/lib/communications";
import { logServerError } from "@/lib/safe-logger";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { parseOrgSettings } from "@/lib/org-settings";
import {
  enabledReminderChannels,
  isCadenceDue,
  isQuietHour,
  reminderTag,
  type ReminderCadence,
} from "@/lib/reminders";

type ReminderAppointment = Prisma.AppointmentGetPayload<{
  include: {
    patient: { include: { organization: true } };
    provider: true;
  };
}>;

/**
 * CRON endpoint: sends appointment reminders per org configuration.
 * Two cadences — a 24h heads-up and a 1h last-call — each with its own
 * dedupe tag, each toggleable per org, with per-channel toggles and quiet
 * hours (a run inside quiet hours sends nothing and marks nothing, so the
 * next run retries). One Communication row per channel keeps delivery
 * status (sent/failed) observable in the communications module.
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const cronAuth = authorizeCronRequest(request);
    if (!cronAuth.ok) return cronAuth.response;

    const now = new Date();
    const horizon = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: now, lte: horizon },
        status: { in: ["scheduled", "confirmed"] },
      },
      include: {
        patient: { include: { organization: true } },
        provider: true,
      },
      take: 100,
    });

    let sent = 0;
    let failed = 0;
    let skippedQuiet = 0;

    for (const appointment of upcomingAppointments as ReminderAppointment[]) {
      const patient = appointment.patient;
      if (patient.status === "Archived") continue;
      if (patient.organization?.status !== "active") continue;

      const settings = parseOrgSettings(patient.organization?.settingsJson);
      if (settings.appointmentReminders === false) continue;
      const cadences: ReminderCadence[] = [
        ...(settings.reminderConfig?.enabled24h !== false ? (["24h"] as const) : []),
        ...(settings.reminderConfig?.enabled1h !== false ? (["1h"] as const) : []),
      ];
      if (cadences.length === 0) continue;
      if (
        isQuietHour(now, settings.reminderConfig?.quietStart, settings.reminderConfig?.quietEnd)
      ) {
        skippedQuiet += 1;
        continue;
      }
      const channels = enabledReminderChannels(settings.reminderConfig?.channels);
      if (channels.length === 0) continue;

      const messages = renderAppointmentReminder(
        patient.firstName,
        appointment.startTime,
        appointment.provider?.name || "Your Doctor",
        appointment.telehealthUrl,
      );

      for (const cadence of cadences) {
        if (!isCadenceDue(appointment.startTime, now, cadence)) continue;
        const tag = reminderTag(appointment.id, cadence);
        const existing = await prisma.communication.findFirst({
          where: { patientId: patient.id, type: "reminder", content: { contains: tag } },
          select: { id: true },
        });
        if (existing) continue;

        for (const channel of channels) {
          let status: "sent" | "failed" = "sent";
          try {
            if (channel === "sms" && patient.phone) {
              await sendSMS(patient.phone, messages.sms);
            } else if (channel === "whatsapp" && patient.phone) {
              await sendWhatsApp(patient.phone, messages.whatsapp);
            } else if (channel === "email" && patient.email) {
              await sendEmail(patient.email, "Appointment Reminder", messages.email);
            } else {
              throw new Error(`No recipient address for ${channel}`);
            }
          } catch (error) {
            logServerError(`Failed to send ${channel} reminder`, error);
            status = "failed";
          }
          const body =
            channel === "email" ? messages.email : channel === "whatsapp" ? messages.whatsapp : messages.sms;
          const record = await prisma.communication.create({
            data: {
              organizationId: patient.organizationId,
              patientId: patient.id,
              channel,
              type: "reminder",
              status,
              content: `${tag}\n\n${body}`,
              sentAt: status === "sent" ? now : null,
            },
          });
          if (status === "sent") sent += 1;
          else failed += 1;
          await createAuditLog({
            organizationId: patient.organizationId,
            action: "CREATE",
            entityType: "Communication",
            entityId: record.id,
            actorType: "system",
            actorIdentifier: "cron:appointment-reminders",
            afterState: JSON.stringify({
              patientId: patient.id,
              appointmentId: appointment.id,
              cadence,
              channel,
              type: "reminder",
              status,
            }),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      appointmentsProcessed: upcomingAppointments.length,
      remindersSent: sent,
      remindersFailed: failed,
      skippedQuiet,
    });
  } catch (error) {
    logServerError("Appointment reminder CRON error", error);
    return NextResponse.json(
      { error: "Failed to send appointment reminders" },
      { status: 500 },
    );
  }
}
