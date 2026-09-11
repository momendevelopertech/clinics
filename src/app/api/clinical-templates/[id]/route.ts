import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { clinicalTemplateUpdateSchema } from "@/lib/validations/encounter";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = clinicalTemplateUpdateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const existing = await prisma.clinicalTemplate.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const updated = await prisma.clinicalTemplate.update({ where: { id }, data: parsed.data });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "ClinicalTemplate",
      entityId: id,
      beforeState: JSON.stringify(existing),
      afterState: JSON.stringify(updated),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating clinical template", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const existing = await prisma.clinicalTemplate.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    await prisma.clinicalTemplate.delete({ where: { id } });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "DELETE",
      entityType: "ClinicalTemplate",
      entityId: id,
      beforeState: JSON.stringify(existing),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting clinical template", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
