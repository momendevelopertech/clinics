import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import {
  treatmentPlanStepCreateSchema,
  treatmentPlanStepUpdateSchema,
} from "@/lib/validations";
import { isStepTransitionAllowed } from "@/lib/treatment-plans";

async function guardPlan(orgId: string, planId: string) {
  return prisma.treatmentPlan.findFirst({
    where: { id: planId, organizationId: orgId },
    select: { id: true },
  });
}

/** POST /api/treatment-plans/[id]/steps — append a step to a plan. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: planId } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = treatmentPlanStepCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (!(await guardPlan(orgId, planId))) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    const step = await prisma.treatmentPlanStep.create({
      data: {
        planId,
        kind: parsed.data.kind,
        refId: parsed.data.refId ?? null,
        title: parsed.data.title,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: "pending",
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "TreatmentPlanStep",
      entityId: step.id,
      afterState: JSON.stringify({ planId, kind: step.kind, title: step.title }),
    });
    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    logServerError("Error creating plan step", error);
    return NextResponse.json({ error: "Failed to create step" }, { status: 500 });
  }
}

/** PATCH /api/treatment-plans/[id]/steps?stepId= — move one step. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: planId } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const stepId = new URL(request.url).searchParams.get("stepId");
    const parsed = treatmentPlanStepUpdateSchema.safeParse(await request.json().catch(() => ({})));
    if (!stepId || !parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const step = await prisma.treatmentPlanStep.findFirst({
      where: { id: stepId, plan: { id: planId, organizationId: orgId } },
    });
    if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });
    if (!isStepTransitionAllowed(step.status, parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot move step from ${step.status} to ${parsed.data.status}` },
        { status: 409 },
      );
    }
    const updated = await prisma.treatmentPlanStep.update({
      where: { id: stepId },
      data: { status: parsed.data.status },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "TreatmentPlanStep",
      entityId: stepId,
      beforeState: JSON.stringify({ status: step.status }),
      afterState: JSON.stringify({ status: updated.status }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating plan step", error);
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}
