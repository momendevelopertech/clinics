import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { patientAllergyUpdateSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; allergyId: string }> },
) {
  try {
    const { id, allergyId } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const userId = await getCurrentUserId(orgId);
    const canWrite = await hasPermission(userId, orgId, "encounters:write", "encounters");
    if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await prisma.patientAllergy.findFirst({
      where: { id: allergyId, patientId: id, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Allergy not found" }, { status: 404 });

    const parsed = patientAllergyUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.patientAllergy.update({
      where: { id: allergyId },
      data: {
        allergen: parsed.data.allergen ?? existing.allergen,
        severity:
          parsed.data.severity === undefined ? existing.severity : parsed.data.severity,
        reaction:
          parsed.data.reaction === undefined ? existing.reaction : parsed.data.reaction || null,
        onset:
          parsed.data.onset === undefined || parsed.data.onset === null
            ? existing.onset
            : new Date(parsed.data.onset),
        active: parsed.data.active ?? existing.active,
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "PatientAllergy",
      entityId: allergyId,
      beforeState: JSON.stringify({ allergen: existing.allergen, active: existing.active }),
      afterState: JSON.stringify({ allergen: updated.allergen, active: updated.active }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating patient allergy", error);
    return NextResponse.json({ error: "Failed to update allergy" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; allergyId: string }> },
) {
  try {
    const { id, allergyId } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const userId = await getCurrentUserId(orgId);
    const canWrite = await hasPermission(userId, orgId, "encounters:write", "encounters");
    if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await prisma.patientAllergy.findFirst({
      where: { id: allergyId, patientId: id, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Allergy not found" }, { status: 404 });

    await prisma.patientAllergy.delete({ where: { id: allergyId } });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "DELETE",
      entityType: "PatientAllergy",
      entityId: allergyId,
      beforeState: JSON.stringify({ allergen: existing.allergen }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting patient allergy", error);
    return NextResponse.json({ error: "Failed to delete allergy" }, { status: 500 });
  }
}