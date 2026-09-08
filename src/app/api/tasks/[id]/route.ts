import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "tasks");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const existing = await prisma.task.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, assigneeId, priority, dueDate } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const t = await tx.task.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "UPDATE",
          entityType: "Task",
          entityId: id,
          beforeState: JSON.stringify(existing),
          afterState: JSON.stringify(t),
        },
      });

      return t;
      },
    );

    const withRelations = await prisma.task.findUnique({
      where: { id: updated.id },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        assignee: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    return NextResponse.json(withRelations ?? updated);
  } catch (error) {
    logServerError("Error updating task", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}
