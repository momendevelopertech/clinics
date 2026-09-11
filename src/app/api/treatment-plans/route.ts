import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { treatmentPlanCreateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const plans = await prisma.treatmentPlan.findMany({
      where: {
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        steps: { orderBy: { createdAt: "asc" } },
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(plans);
  } catch (error) {
    logServerError("Error fetching treatment plans", error);
    return NextResponse.json({ error: "Failed to fetch treatment plans" }, { status: 500 });
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
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = treatmentPlanCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const patient = await prisma.patient.findFirst({
      where: { id: parsed.data.patientId, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    if (parsed.data.encounterId) {
      const encounter = await prisma.encounter.findFirst({
        where: { id: parsed.data.encounterId, organizationId: orgId, patientId: patient.id },
        select: { id: true },
      });
      if (!encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const plan = await prisma.treatmentPlan.create({
      data: {
        organizationId: orgId,
        patientId: patient.id,
        encounterId: parsed.data.encounterId ?? null,
        title: parsed.data.title,
        notes: parsed.data.notes || null,
        status: "draft",
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "TreatmentPlan",
      entityId: plan.id,
      afterState: JSON.stringify({ title: plan.title, patientId: patient.id }),
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    logServerError("Error creating treatment plan", error);
    return NextResponse.json({ error: "Failed to create treatment plan" }, { status: 500 });
  }
}
