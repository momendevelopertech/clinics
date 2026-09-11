import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { canConsumeSession, sessionsRemaining, statusAfterConsume } from "@/lib/packages";
import { z } from "zod";

const consumeSchema = z.object({
  procedureOrderId: z.string().min(1).max(100).optional().nullable(),
});

/**
 * POST /api/patient-packages/[id]/consume — burns one session off the
 * balance. The last session flips the plan to completed. Empty or
 * non-active plans are rejected (409), never driven negative.
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
    if (
      !canConsumeSession({
        status: plan.status,
        sessionsTotal: plan.sessionsTotal,
        sessionsUsed: plan.sessionsUsed,
      })
    ) {
      return NextResponse.json(
        { error: `No sessions left (status: ${plan.status})` },
        { status: 409 },
      );
    }
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

    const usedAfter = plan.sessionsUsed + 1;
    const updated = await prisma.patientPackage.update({
      where: { id },
      data: {
        sessionsUsed: usedAfter,
        status: statusAfterConsume(plan.sessionsTotal, usedAfter),
      },
    });
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
        remaining: sessionsRemaining(updated.sessionsTotal, updated.sessionsUsed),
      }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error consuming package session", error);
    return NextResponse.json({ error: "Failed to consume session" }, { status: 500 });
  }
}
