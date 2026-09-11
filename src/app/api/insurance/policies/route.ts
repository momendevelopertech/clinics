import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { insurancePolicySchema } from "@/lib/validations/billing";

async function guard(orgId: string) {
  const moduleAuthz = await requireModulePermission(orgId, "billing");
  if (moduleAuthz.response) return moduleAuthz.response;
  const authz = await requireAnyPermission(orgId, [
    { action: "billing:write", resource: "billing" },
  ]);
  if (authz.response) return authz.response;
  return null;
}

/** List a patient's insurance policies. */
export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const denied = await guard(orgId);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const policies = await prisma.insurancePolicy.findMany({
      where: {
        patient: { organizationId: orgId },
        ...(patientId ? { patientId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ policies });
  } catch (error) {
    logServerError("List insurance policies error", error);
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 });
  }
}

/** Attach an insurance policy to a patient. */
export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = insurancePolicySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid policy", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: parsed.data.patientId, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        patientId: patient.id,
        provider: parsed.data.provider,
        policyNumber: parsed.data.policyNumber,
        groupNumber: parsed.data.groupNumber ?? null,
        type: parsed.data.type,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "InsurancePolicy",
      entityId: policy.id,
      afterState: JSON.stringify({ patientId: patient.id, provider: policy.provider }),
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    logServerError("Create insurance policy error", error);
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 });
  }
}
