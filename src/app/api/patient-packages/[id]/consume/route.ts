import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { statusAfterConsume } from "@/lib/packages";
import { z } from "zod";

const consumeSchema = z.object({
  procedureOrderId: z.string().min(1).max(100).optional().nullable(),
});

class NoSessionsLeftError extends Error {}

/**
 * POST /api/patient-packages/[id]/consume — burns one session off the
 * balance. Compare-and-set on `sessionsUsed` makes concurrent consumes safe
 * (the first one wins; the loser gets 409). The last session flips the plan
 * to completed. Depleted/cancelled plans never go negative.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(context.organizationId, "catalogs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(context.organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const parsed = consumeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const plan = await prisma.patientPackage.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!plan) return NextResponse.json({ error: "Patient package not found" }, { status: 404 });
    if (parsed.data.procedureOrderId) {
      const order = await prisma.procedureOrder.findFirst({
        where: {
          id: parsed.data.procedureOrderId,
          organizationId: context.organizationId,
          patientId: plan.patientId,
        },
        select: { id: true },
      });
      if (!order) return NextResponse.json({ error: "Procedure order not found" }, { status: 404 });
    }

    let updated: Prisma.PatientPackageGetPayload<Record<string, never>>;
    try {
      updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Atomic claim: only an active plan with remaining sessions can burn one.
        await tx.patientPackage.updateMany({
          where: {
            id,
            organizationId: context.organizationId,
            status: "active",
            sessionsUsed: { lt: plan.sessionsTotal },
          },
          data: { sessionsUsed: { increment: 1 } },
        });
        const fresh = await tx.patientPackage.findUniqueOrThrow({ where: { id } });
        if (!(fresh.sessionsUsed < fresh.sessionsTotal)) {
          throw new NoSessionsLeftError();
        }
        const after = fresh.sessionsUsed;
        const finalStatus = statusAfterConsume(fresh.sessionsTotal, after);
        if (finalStatus !== fresh.status) {
          await tx.patientPackage.update({ where: { id }, data: { status: finalStatus } });
        }
        return { ...fresh, status: finalStatus };
      });
    } catch (error) {
      if (error instanceof NoSessionsLeftError) {
        return NextResponse.json(
          { error: "No sessions left on this package" },
          { status: 409 },
        );
      }
      throw error;
    }

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "UPDATE",
      entityType: "PatientPackage",
      entityId: id,
      beforeState: JSON.stringify({ sessionsUsed: plan.sessionsUsed, status: plan.status }),
      afterState: JSON.stringify({
        sessionsUsed: updated.sessionsUsed,
        status: updated.status,
        remaining: updated.sessionsTotal - updated.sessionsUsed,
      }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error consuming package session", error);
    return NextResponse.json({ error: "Failed to consume session" }, { status: 500 });
  }
}