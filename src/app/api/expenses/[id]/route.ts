import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

/** DELETE /api/expenses/[id] — audited removal (correction = delete + re-add). */
export async function DELETE(
  _request: Request,
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

    const existing = await prisma.expense.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    await prisma.expense.delete({ where: { id } });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "DELETE",
      entityType: "Expense",
      entityId: id,
      beforeState: JSON.stringify(existing),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting expense", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
