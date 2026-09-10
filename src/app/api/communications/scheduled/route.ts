import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  sendSMS,
  sendEmail,
  sendWhatsApp,
} from "@/lib/communications";
import { logServerError } from "@/lib/safe-logger";
import { authorizeCronRequest } from "@/lib/cron-auth";

type ScheduledCommunication = Prisma.CommunicationGetPayload<{
  include: {
    patient: true;
  };
}>;

/**
 * CRON endpoint: Processes scheduled communications
 * Call this periodically (e.g., every minute) to send scheduled messages
 * Should be protected by a CRON secret in production
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const cronAuth = authorizeCronRequest(request);
    if (!cronAuth.ok) return cronAuth.response;

    // Find all scheduled communications that are due
    const now = new Date();
    const scheduledComms = await prisma.communication.findMany({
      where: {
        status: "scheduled",
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        patient: true,
      },
      take: 100, // Process up to 100 at a time
    });

    let sent = 0;
    let failed = 0;

    for (const comm of scheduledComms as ScheduledCommunication[]) {
      try {
        const patient = comm.patient;

        // Send based on channel
        if (comm.channel === "sms" && patient.phone) {
          await sendSMS(patient.phone, comm.content);
        } else if (comm.channel === "email" && patient.email) {
          await sendEmail(patient.email, comm.type, comm.content);
        } else if (comm.channel === "whatsapp" && patient.phone) {
          await sendWhatsApp(patient.phone, comm.content);
        }

        // Mark as sent
        await prisma.communication.update({
          where: { id: comm.id },
          data: {
            status: "sent",
            sentAt: now,
          },
        });

        await createAuditLog({
          organizationId: comm.organizationId,
          action: "UPDATE",
          entityType: "Communication",
          entityId: comm.id,
          actorType: "system",
          actorIdentifier: "cron:scheduled-communications",
          beforeState: JSON.stringify({ status: comm.status }),
          afterState: JSON.stringify({ status: "sent", sentAt: now }),
        });

        sent++;
      } catch (error) {
        logServerError("Failed to send scheduled communication", error, {
          communicationId: comm.id,
        });

        // Mark as failed
        await prisma.communication.update({
          where: { id: comm.id },
          data: { status: "failed" },
        });

        await createAuditLog({
          organizationId: comm.organizationId,
          action: "UPDATE",
          entityType: "Communication",
          entityId: comm.id,
          actorType: "system",
          actorIdentifier: "cron:scheduled-communications",
          beforeState: JSON.stringify({ status: comm.status }),
          afterState: JSON.stringify({ status: "failed" }),
        });

        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: scheduledComms.length,
      sent,
      failed,
      message: `Processed ${scheduledComms.length} scheduled communications`,
    });
  } catch (error) {
    logServerError("Scheduled communications CRON error", error);
    return NextResponse.json(
      { error: "Failed to process scheduled communications" },
      { status: 500 },
    );
  }
}
