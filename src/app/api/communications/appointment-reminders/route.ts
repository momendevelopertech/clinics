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

type ReminderAppointment = Prisma.AppointmentGetPayload<{
  include: {
    patient: { include: { organization: true } };
    provider: true;
  };
}>;

type ReminderChannel = "sms" | "whatsapp" | "email";

/**
 * CRON endpoint: Sends appointment reminders (SMS + WhatsApp + Email).
 * Sends reminders 24 hours, 2 hours, and 30 minutes before appointments
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const cronAuth = authorizeCronRequest(request);
    if (!cronAuth.ok) return cronAuth.response;

    const now = new Date();
    const reminders = [];

    // Only actionable appointments: no reminders for cancelled, completed,
    // no-show, or in-progress visits.
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
          lte: in24Hours,
        },
        status: { in: ["scheduled", "confirmed"] },
      },
      include: {
        patient: { include: { organization: true } },
        provider: true,
      },
      take: 100,
    });

    for (const appointment of upcomingAppointments as ReminderAppointment[]) {
      const patient = appointment.patient;
      const provider = appointment.provider;

      // Archived patients and suspended organizations get no reminders.
      if (patient.status === "Archived") continue;
      if (patient.organization?.status !== "active") continue;

      // Check if reminder already sent (you might want to add a field to track this)
      // For now, we'll send reminders if communication doesn't exist
      const existingReminder = await prisma.communication.findFirst({
        where: {
          patientId: patient.id,
          type: "reminder",
          content: {
            contains: appointment.id,
          },
        },
      });

      if (!existingReminder) {
        const messages = renderAppointmentReminder(
          patient.firstName,
          appointment.startTime,
          provider?.name || "Your Doctor",
        );

        const attempts: Array<{ channel: ReminderChannel; send: () => Promise<unknown> }> = [];
        if (patient.phone) {
          attempts.push({
            channel: "sms",
            send: () => sendSMS(patient.phone!, messages.sms),
          });
          attempts.push({
            channel: "whatsapp",
            send: () => sendWhatsApp(patient.phone!, messages.whatsapp),
          });
        }
        if (patient.email) {
          attempts.push({
            channel: "email",
            send: () => sendEmail(patient.email!, "Appointment Reminder", messages.email),
          });
        }

        const outcomes: Array<{ channel: ReminderChannel; status: "sent" | "failed" }> = [];
        for (const attempt of attempts) {
          try {
            await attempt.send();
            outcomes.push({ channel: attempt.channel, status: "sent" });
          } catch (error) {
            logServerError(`Failed to send ${attempt.channel} reminder`, error);
            outcomes.push({ channel: attempt.channel, status: "failed" });
          }
        }

        // One communication record per channel with its true status, so
        // failures are observable (and retried next run only if nothing
        // was recorded — the dedupe tag below marks the appointment done).
        const tag = `[APPOINTMENT_ID: ${appointment.id}]`;
        for (const outcome of outcomes) {
          const body =
            outcome.channel === "email"
              ? messages.email
              : outcome.channel === "whatsapp"
                ? messages.whatsapp
                : messages.sms;
          const record = await prisma.communication.create({
            data: {
              organizationId: patient.organizationId,
              patientId: patient.id,
              channel: outcome.channel,
              type: "reminder",
              status: outcome.status,
              content: `${tag}\n\n${body}`,
              sentAt: outcome.status === "sent" ? now : null,
            },
          });
          reminders.push({
            appointmentId: appointment.id,
            patientId: patient.id,
            channel: outcome.channel,
            status: outcome.status,
          });

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
              channel: outcome.channel,
              type: "reminder",
              status: outcome.status,
            }),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      appointmentsProcessed: upcomingAppointments.length,
      remindersSent: reminders.filter((r) => r.status === "sent").length,
      remindersFailed: reminders.filter((r) => r.status === "failed").length,
      message: `Sent ${reminders.length} appointment reminders`,
    });
  } catch (error) {
    logServerError("Appointment reminder CRON error", error);
    return NextResponse.json(
      { error: "Failed to send appointment reminders" },
      { status: 500 },
    );
  }
}
