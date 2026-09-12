import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { treatmentPlanUpdateSchema } from "@/lib/validations";
import { isPlanFinishable, isPlanTransitionAllowed } from "@/lib/treatment-plans";

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

    const parsed = treatmentPlanUpdateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id, organizationId: orgId },
      include: { steps: { select: { status: true } } },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    if (parsed.data.status && !isPlanTransitionAllowed(plan.status, parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot move plan from ${plan.status} to ${parsed.data.status}` },
        { status: 409 },
      );
    }
    if (
      parsed.data.status === "completed" &&
      !isPlanFinishable(plan.steps.map((s) => s.status))
    ) {
      return NextResponse.json(
        { error: "Complete or skip all pending steps first" },
        { status: 409 },
      );
    }

    const updated = await prisma.treatmentPlan.update({
      where: { id },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      },
      include: { steps: { orderBy: { createdAt: "asc" } } },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "TreatmentPlan",
      entityId: id,
      beforeState: JSON.stringify({ status: plan.status }),
      afterState: JSON.stringify({ status: updated.status }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating treatment plan", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

/** DELETE /api/treatment-plans/[id] — removes a draft/active plan with its steps. */
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

    const plan = await prisma.treatmentPlan.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (plan.status === "completed") {
      return NextResponse.json(
        { error: "Completed plans are kept for the medical record" },
        { status: 409 },
      );
    }

    await prisma.treatmentPlan.delete({ where: { id } });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "DELETE",
      entityType: "TreatmentPlan",
      entityId: id,
      beforeState: JSON.stringify({ status: plan.status, title: plan.title }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting treatment plan", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
