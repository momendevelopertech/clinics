import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export type WaitlistRankEntry = {
  id: string;
  preferredDate: Date | null;
  createdAt: Date;
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Pure ranking for auto-offer: entries whose preferredDate falls on the
 * freed slot's day go first, then oldest-waiting. Pure and unit-tested.
 */
export function rankWaitlistCandidates<T extends WaitlistRankEntry>(
  entries: T[],
  freedStart: Date,
  limit = 3,
): T[] {
  return [...entries]
    .sort((a, b) => {
      const aSameDay = a.preferredDate ? isSameDay(a.preferredDate, freedStart) : false;
      const bSameDay = b.preferredDate ? isSameDay(b.preferredDate, freedStart) : false;
      if (aSameDay !== bSameDay) return aSameDay ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .slice(0, Math.max(0, limit));
}

export type FreedSlot = {
  providerId: string;
  startTime: Date;
  endTime: Date;
};

export type AutoOfferActor =
  | { type: "staff"; userId: string }
  | { type: "patient"; identifier: string };

/**
 * Offers a freed slot to waiting patients: top-ranked entries flip to
 * "offered", each with an audit record, plus a scheduled SMS/Email queued
 * through the normal communications dispatch pipeline. Best-effort — callers
 * must never fail a cancellation because auto-offer failed.
 */
export async function autoOfferFreedSlot(params: {
  organizationId: string;
  slot: FreedSlot;
  actor: AutoOfferActor;
  limit?: number;
}): Promise<Array<{ entryId: string; patientId: string; notified: boolean }>> {
  const { organizationId, slot, actor, limit = 3 } = params;
  try {
    const waiting = await prisma.waitlistEntry.findMany({
      where: { organizationId, status: "waiting" },
      select: {
        id: true,
        patientId: true,
        preferredDate: true,
        createdAt: true,
        patient: { select: { firstName: true, phone: true, email: true } },
      },
      take: 50,
    });
    if (waiting.length === 0) return [];

    const ranked = rankWaitlistCandidates(waiting, slot.startTime, limit);
    const when = slot.startTime.toLocaleString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const offered: Array<{ entryId: string; patientId: string; notified: boolean }> = [];
    for (const entry of ranked) {
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "offered" },
      });

      let notified = false;
      const contact = waiting.find((w) => w.id === entry.id);
      const phone = contact?.patient.phone;
      const email = contact?.patient.email;
      if (phone || email) {
        const channel = phone ? "sms" : "email";
        const content =
          `Hi ${contact?.patient.firstName ?? ""}, a slot opened up on ${when}. ` +
          `Reply to claim it — first come, first served.`;
        await prisma.communication.create({
          data: {
            organizationId,
            patientId: entry.patientId,
            channel,
            type: "waitlist_offer",
            status: "scheduled",
            content,
            scheduledFor: new Date(),
          },
        });
        notified = true;
      }

      await createAuditLog({
        organizationId,
        ...(actor.type === "staff" ? { userId: actor.userId } : {}),
        action: "UPDATE",
        entityType: "WaitlistEntry",
        entityId: entry.id,
        ...(actor.type === "patient"
          ? { actorType: "patient", actorIdentifier: actor.identifier }
          : {}),
        beforeState: JSON.stringify({ status: "waiting" }),
        afterState: JSON.stringify({ status: "offered", notified }),
      });

      offered.push({ entryId: entry.id, patientId: entry.patientId, notified });
    }
    return offered;
  } catch (error) {
    logServerError("Waitlist auto-offer failed", error);
    return [];
  }
}
