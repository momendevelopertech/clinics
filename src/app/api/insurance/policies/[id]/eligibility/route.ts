import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { checkEligibility } from "@/lib/insurance";

/** Eligibility check for a patient's policy at this clinic. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:read", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const { id } = await params;
    const policy = await prisma.insurancePolicy.findFirst({
      where: { id, patient: { organizationId: orgId } },
      include: {
        patient: { select: { id: true, status: true, organizationId: true } },
      },
    });
    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { status: true },
    });

    return NextResponse.json({
      policyId: policy.id,
      ...checkEligibility({
        patientStatus: policy.patient.status,
        organizationStatus: org?.status,
        hasPolicy: true,
        policyType: policy.type,
      }),
    });
  } catch (error) {
    logServerError("Insurance eligibility error", error);
    return NextResponse.json({ error: "Eligibility check failed" }, { status: 500 });
  }
}
