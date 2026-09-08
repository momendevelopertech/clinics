import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { diagnosisSchema, followUpSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const params = new URL(request.url).searchParams;
    const patientId = params.get("patientId");
    const [diagnoses, followUps] = await Promise.all([
      prisma.diagnosis.findMany({ where: { organizationId, ...(patientId ? { patientId } : {}) }, orderBy: { createdAt: "desc" } }),
      prisma.followUp.findMany({ where: { organizationId, ...(patientId ? { patientId } : {}) }, orderBy: { dueDate: "asc" } }),
    ]);
    return NextResponse.json({ diagnoses, followUps });
  } catch (error) {
    logServerError("Failed to fetch clinical orders", error);
    return NextResponse.json({ error: "Failed to fetch clinical orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [{ action: "encounters:write", resource: "encounters" }, { action: "patients:write", resource: "patients" }]);
    if (authz.response) return authz.response;
    const body = await request.json() as { kind?: string };
    if (body.kind !== "diagnosis" && body.kind !== "followUp") {
      return NextResponse.json({ error: "kind must be diagnosis or followUp" }, { status: 400 });
    }
    const parsed = body.kind === "diagnosis" ? diagnosisSchema.safeParse(body) : followUpSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const patientId = parsed.data.patientId;
    const patient = await prisma.patient.findFirst({ where: { id: patientId, organizationId }, select: { id: true } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    if (parsed.data.encounterId) {
      const encounter = await prisma.encounter.findFirst({ where: { id: parsed.data.encounterId, organizationId, patientId }, select: { id: true } });
      if (!encounter) return NextResponse.json({ error: "Encounter not found for patient" }, { status: 400 });
    }
    const result = body.kind === "diagnosis"
      ? await prisma.diagnosis.create({ data: { ...diagnosisSchema.parse(body), organizationId, status: diagnosisSchema.parse(body).status ?? "active" } })
      : await prisma.followUp.create({ data: { ...followUpSchema.parse(body), organizationId, dueDate: new Date(followUpSchema.parse(body).dueDate) } });
    await prisma.auditLog.create({ data: { organizationId, userId: authz.userId, action: "CREATE", entityType: body.kind === "diagnosis" ? "Diagnosis" : "FollowUp", entityId: result.id, afterState: JSON.stringify(result) } });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logServerError("Failed to create clinical order", error);
    return NextResponse.json({ error: "Failed to create clinical order" }, { status: 500 });
  }
}
