import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { encounterUpdateSchema } from "@/lib/validations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [{ action: "encounters:write", resource: "encounters" }]);
    if (authz.response) return authz.response;
    const existing = await prisma.encounter.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    const parsed = encounterUpdateSchema.safeParse(await request.json());
    if (!parsed.success || !parsed.data.status) return NextResponse.json({ error: "Invalid encounter update" }, { status: 400 });
    if (existing.status === "completed" && parsed.data.status !== "completed") {
      return NextResponse.json({ error: "Completed encounters cannot be reopened" }, { status: 409 });
    }
    if (existing.status === parsed.data.status) return NextResponse.json(existing);
    const updated = await prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.update({
        where: { id },
        data: { status: parsed.data.status, endTime: parsed.data.status === "completed" ? new Date() : null },
      });
      await tx.auditLog.create({
        data: { organizationId, userId: authz.userId, action: "UPDATE", entityType: "Encounter", entityId: id, beforeState: JSON.stringify(existing), afterState: JSON.stringify(encounter) },
      });
      return encounter;
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update encounter" }, { status: 500 });
  }
}
