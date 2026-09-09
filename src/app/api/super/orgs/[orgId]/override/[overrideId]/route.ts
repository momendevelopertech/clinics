import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; overrideId: string }> },
) {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.ok) {
      return NextResponse.json(guard.error, { status: guard.status });
    }
    const { orgId, overrideId } = await params;

    const existing = await prisma.entitlementOverride.findFirst({
      where: { id: overrideId, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Override not found" }, { status: 404 });
    }

    await prisma.entitlementOverride.delete({ where: { id: overrideId } });

    await createAuditLog({
      organizationId: orgId,
      userId: guard.userId,
      action: "DELETE",
      entityType: "platform_entitlement_override",
      entityId: overrideId,
      beforeState: JSON.stringify(existing),
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logServerError("DELETE /api/super/orgs/[orgId]/override/[overrideId] error", error);
    return NextResponse.json(
      { error: "Failed to delete override" },
      { status: 500 },
    );
  }
}