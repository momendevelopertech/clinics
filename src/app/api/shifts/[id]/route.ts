import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

/** DELETE /api/shifts/[id] — Owner-only rota removal (audited). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await prisma.shift.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

    await prisma.shift.delete({ where: { id } });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "DELETE",
      entityType: "Shift",
      entityId: id,
      beforeState: JSON.stringify(existing),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting shift", error);
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
  }
}
