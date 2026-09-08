import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { vitalSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const encounterId = searchParams.get("encounterId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const vitals = await prisma.vital.findMany({
      where: {
        patientId,
        ...(encounterId ? { encounterId } : {}),
      },
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json(vitals);
  } catch (error) {
    logServerError("Error fetching vitals", error);
    return NextResponse.json(
      { error: "Failed to fetch vitals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const { patientId, encounterId, ...vitalData } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    const parsed = vitalSchema.safeParse(vitalData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const data = parsed.data;
    let bmi = data.bmi;
    if (data.weightKg && data.heightCm && !bmi) {
      const heightM = data.heightCm / 100;
      bmi = Math.round((data.weightKg / (heightM * heightM)) * 10) / 10;
    }

    const vital = await prisma.vital.create({
      data: {
        patientId,
        encounterId: encounterId || null,
        weightKg: data.weightKg ?? null,
        heightCm: data.heightCm ?? null,
        bloodPressureSystolic: data.bloodPressureSystolic ?? null,
        bloodPressureDiastolic: data.bloodPressureDiastolic ?? null,
        heartRate: data.heartRate ?? null,
        bmi: bmi ?? null,
        spO2: data.spO2 ?? null,
        temperature: data.temperature ?? null,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Vital",
      entityId: vital.id,
      afterState: JSON.stringify(vital),
    });

    return NextResponse.json(vital, { status: 201 });
  } catch (error) {
    logServerError("Error creating vital", error);
    return NextResponse.json(
      { error: "Failed to create vital" },
      { status: 500 }
    );
  }
}
