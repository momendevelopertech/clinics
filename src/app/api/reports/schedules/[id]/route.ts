import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

/** Owner-only: delete a report schedule. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await prisma.reportSchedule.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    await prisma.reportSchedule.delete({ where: { id } });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "DELETE",
      entityType: "ReportSchedule",
      entityId: id,
      beforeState: JSON.stringify(existing),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting report schedule", error);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
