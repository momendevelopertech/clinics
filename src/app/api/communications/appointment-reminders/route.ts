import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  sendSMS,
  sendEmail,
  renderAppointmentReminder,
} from "@/lib/communications";
import { logServerError } from "@/lib/safe-logger";
import { authorizeCronRequest } from "@/lib/cron-auth";

type ReminderAppointment = Prisma.AppointmentGetPayload<{
  include: {
    patient: true;
    provider: true;
  };
}>;

/**
 * CRON endpoint: Sends appointment reminders
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

    // Find appointments in the next 24 hours that haven't been reminded
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
          lte: in24Hours,
        },
      },
      include: {
        patient: true,
        provider: true,
      },
      take: 100,
    });

    for (const appointment of upcomingAppointments as ReminderAppointment[]) {
      const patient = appointment.patient;
      const provider = appointment.provider;

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

        // Send SMS if patient has phone
        if (patient.phone) {
          try {
            await sendSMS(patient.phone, messages.sms);
            reminders.push({
              appointmentId: appointment.id,
              patientId: patient.id,
              channel: "sms",
              status: "sent",
            });
          } catch (error) {
            logServerError("Failed to send SMS reminder", error);
          }
        }

        // Send Email if patient has email
        if (patient.email) {
          try {
            await sendEmail(
              patient.email,
              "Appointment Reminder",
              messages.email,
            );
            reminders.push({
              appointmentId: appointment.id,
              patientId: patient.id,
              channel: "email",
              status: "sent",
            });
          } catch (error) {
            logServerError("Failed to send email reminder", error);
          }
        }

        // Log the reminder communication
        const communication = await prisma.communication.create({
          data: {
            organizationId: patient.organizationId,
            patientId: patient.id,
            channel: patient.phone ? "sms" : "email",
            type: "reminder",
            status: "sent",
            content: `[APPOINTMENT_ID: ${appointment.id}]\n\n${messages.sms}`,
            sentAt: now,
          },
        });

        await createAuditLog({
          organizationId: patient.organizationId,
          action: "CREATE",
          entityType: "Communication",
          entityId: communication.id,
          actorType: "system",
          actorIdentifier: "cron:appointment-reminders",
          afterState: JSON.stringify({
            patientId: patient.id,
            appointmentId: appointment.id,
            channel: communication.channel,
            type: communication.type,
            status: communication.status,
          }),
        });
      }
    }

    return NextResponse.json({
      success: true,
      appointmentsProcessed: upcomingAppointments.length,
      remindersSent: reminders.length,
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
