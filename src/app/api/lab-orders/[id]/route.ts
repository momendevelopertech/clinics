import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { labReviewSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { id } = await context.params;
    const parsed = labReviewSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const order = await prisma.labOrder.findFirst({ where: { id, organizationId }, include: { results: true } });
    if (!order) return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    if (order.status === "cancelled") return NextResponse.json({ error: "Cancelled orders cannot be reviewed" }, { status: 409 });
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.labOrder.update({ where: { id }, data: { status: "reviewed" }, include: { results: true } });
      if (result.results.length) {
        await tx.labResult.updateMany({ where: { orderId: id, organizationId }, data: { status: parsed.data.status, reviewedById: authz.userId, reviewedAt: new Date(), reviewNote: parsed.data.reviewNote ?? null } });
      }
      await createAuditLog({ db: tx, organizationId, userId: authz.userId, action: "UPDATE", entityType: "LabOrder", entityId: id, beforeState: JSON.stringify(order), afterState: JSON.stringify(result) });
      return result;
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error reviewing lab order", error);
    return NextResponse.json({ error: "Failed to review lab order" }, { status: 500 });
  }
}
