import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { patientAllergyCreateSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const userId = await getCurrentUserId(orgId);
    const canRead = await hasPermission(userId, orgId, "encounters:read", "encounters");
    if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const patient = await prisma.patient.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const allergies = await prisma.patientAllergy.findMany({
      where: { patientId: id, organizationId: orgId },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(allergies);
  } catch (error) {
    logServerError("Error fetching patient allergies", error);
    return NextResponse.json({ error: "Failed to fetch allergies" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const userId = await getCurrentUserId(orgId);
    const canWrite = await hasPermission(userId, orgId, "encounters:write", "encounters");
    if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = patientAllergyCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const allergy = await prisma.patientAllergy.create({
      data: {
        organizationId: orgId,
        patientId: id,
        allergen: parsed.data.allergen,
        severity: parsed.data.severity ?? null,
        reaction: parsed.data.reaction || null,
        onset: parsed.data.onset ? new Date(parsed.data.onset) : null,
        active: parsed.data.active ?? true,
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "PatientAllergy",
      entityId: allergy.id,
      afterState: JSON.stringify({ allergen: allergy.allergen, severity: allergy.severity }),
    });
    return NextResponse.json(allergy, { status: 201 });
  } catch (error) {
    logServerError("Error creating patient allergy", error);
    return NextResponse.json({ error: "Failed to create allergy" }, { status: 500 });
  }
}