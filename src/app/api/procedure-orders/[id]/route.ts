import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { procedureUpdateSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { id } = await context.params;
    const parsed = procedureUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const existing = await prisma.procedureOrder.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Procedure order not found" }, { status: 404 });
    if (existing.status === "cancelled" || existing.status === "completed") return NextResponse.json({ error: "Final procedure orders cannot be changed" }, { status: 409 });
    const updated = await prisma.procedureOrder.update({ where: { id }, data: { status: parsed.data.status, notes: parsed.data.notes ?? existing.notes, completedAt: parsed.data.status === "completed" ? new Date() : null } });
    await createAuditLog({ organizationId, userId: authz.userId, action: "UPDATE", entityType: "ProcedureOrder", entityId: id, beforeState: JSON.stringify(existing), afterState: JSON.stringify(updated) });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating procedure order", error);
    return NextResponse.json({ error: "Failed to update procedure order" }, { status: 500 });
  }
}
