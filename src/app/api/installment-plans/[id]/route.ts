import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { z } from "zod";

const planCancelSchema = z.object({ status: z.enum(["cancelled"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "billing");
    if (!planAuthz.ok) return planAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = planCancelSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const plan = await prisma.installmentPlan.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (plan.status !== "active") {
      return NextResponse.json({ error: "Only active plans can be cancelled" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.installment.updateMany({
        where: { planId: id, status: { in: ["pending", "overdue"] } },
        data: { status: "cancelled" },
      });
      return tx.installmentPlan.update({ where: { id }, data: { status: "cancelled" } });
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "InstallmentPlan",
      entityId: id,
      beforeState: JSON.stringify({ status: "active" }),
      afterState: JSON.stringify({ status: "cancelled" }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error cancelling installment plan", error);
    return NextResponse.json({ error: "Failed to cancel plan" }, { status: 500 });
  }
}
