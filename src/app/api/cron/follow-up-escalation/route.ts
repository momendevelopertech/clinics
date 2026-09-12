import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { buildFollowUpEscalationMessage } from "@/lib/automation";
import { sendWhatsApp, sendSMS } from "@/lib/communications";

/**
 * POST /api/cron/follow-up-escalation
 *
 * Cron-only endpoint (called by Vercel Cron / external scheduler with the
 * `x-cron-secret` header or a `Bearer` token matching CRON_SECRET). Turns
 * overdue `planned` follow-ups into:
 *   1. an escalable task for the clinic (taskType "follow_up"),
 *   2. an automatic patient reminder message (SMS/WhatsApp), unless the
 *      patient opted out of marketing communications,
 *   3. an audit trail.
 *
 * Uses compare-and-set on FollowUp.status so concurrent timers can never
 * double-escalate the same record, and fails closed when CRON_SECRET is
 * undefined.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 503 },
    );
  }
  const header =
    request.headers.get("x-cron-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const orgIds = await prisma.followUp.findMany({
      where: { status: "planned", dueDate: { lt: now } },
      select: { organizationId: true },
      distinct: ["organizationId"],
    });

    let escalated = 0;
    let tasksCreated = 0;
    let messagesSent = 0;
    let messagesFailed = 0;

    for (const { organizationId } of orgIds) {
      const owner = await prisma.user.findFirst({
        where: {
          organizationId,
          userRoles: { some: { role: { name: "Owner" } } },
        },
        select: { id: true },
      });

      const followUps = await prisma.followUp.findMany({
        where: { organizationId, status: "planned", dueDate: { lt: now } },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              marketingOptOut: true,
            },
          },
          organization: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
      });

      for (const followUp of followUps) {
        const claimed = await prisma.followUp.updateMany({
          where: { id: followUp.id, status: "planned" },
          data: { status: "overdue" },
        });
        if (claimed.count === 0) continue; // another run already escalated it
        escalated += 1;

        if (owner) {
          await prisma.task.create({
            data: {
              organizationId,
              title: `Follow-up overdue: ${followUp.reason}`,
              description:
                followUp.instructions ??
                `Follow-up was due ${followUp.dueDate.toISOString()}.`,
              status: "open",
              priority: "high",
              taskType: "follow_up",
              dueDate: now,
              patientId: followUp.patientId,
              creatorId: owner.id,
            },
          });
          tasksCreated += 1;
        }

        const patient = followUp.patient;
        const phone = patient.phone?.trim();
        if (phone && patient.marketingOptOut === false) {
          const message = buildFollowUpEscalationMessage({
          patientFirstName: patient.firstName,
          clinicName: followUp.organization.name,
          reason: followUp.reason,
        });
          const result =
            phone.startsWith("+") || /^whatsapp:/i.test(phone)
              ? await sendWhatsApp(phone, message)
              : await sendSMS(phone, message);
          const sent = result?.success === true;
          if (sent) messagesSent += 1;
          else messagesFailed += 1;
          await prisma.communication.create({
            data: {
              organizationId,
              patientId: followUp.patientId,
              channel: /^whatsapp:/i.test(phone) ? "whatsapp" : "sms",
              type: "notification",
              content: message,
              status: sent ? "sent" : "failed",
              sentAt: sent ? new Date() : null,
            },
          });
        }

        await createAuditLog({
          organizationId,
          userId: owner?.id ?? null,
          action: "UPDATE",
          entityType: "FollowUp",
          entityId: followUp.id,
          afterState: JSON.stringify({ escalated: true, at: now.toISOString() }),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      escalated,
      tasksCreated,
      messagesSent,
      messagesFailed,
    });
  } catch (error) {
    logServerError("Follow-up escalation cron failed", error);
    return NextResponse.json(
      { error: "Escalation run failed" },
      { status: 500 },
    );
  }
}