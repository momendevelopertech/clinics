import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { patientPackageUpdateSchema } from "@/lib/validations";

/**
 * PATCH /api/patient-packages/[id] — cancel/reactivate an assignment or fix
 * the amount paid. Completed plans are immutable.
 * DELETE /api/patient-packages/[id] — removes a never-used assignment
 * (pristine rows only; anything with consumed sessions must be cancelled).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(context.organizationId, "catalogs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(context.organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const parsed = patientPackageUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment update", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.patientPackage.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Patient package not found" }, { status: 404 });
    }
    if (existing.status === "completed" && parsed.data.status !== undefined) {
      return NextResponse.json(
        { error: "Completed packages cannot change status" },
        { status: 409 },
      );
    }

    const updated = await prisma.patientPackage.update({
      where: { id },
      data: {
        status: parsed.data.status ?? existing.status,
        pricePaid:
          parsed.data.pricePaid === undefined
            ? existing.pricePaid
            : parsed.data.pricePaid === null
              ? null
              : parsed.data.pricePaid.toFixed(2),
      },
    });

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "UPDATE",
      entityType: "PatientPackage",
      entityId: id,
      beforeState: JSON.stringify({ status: existing.status, pricePaid: existing.pricePaid }),
      afterState: JSON.stringify({ status: updated.status, pricePaid: updated.pricePaid }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating patient package", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(context.organizationId, "catalogs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(context.organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const existing = await prisma.patientPackage.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Patient package not found" }, { status: 404 });
    }
    if (existing.sessionsUsed > 0) {
      return NextResponse.json(
        { error: "Cancel the assignment instead of deleting consumed sessions" },
        { status: 409 },
      );
    }

    await prisma.patientPackage.delete({ where: { id } });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "DELETE",
      entityType: "PatientPackage",
      entityId: id,
      beforeState: JSON.stringify({
        patientId: existing.patientId,
        packageId: existing.packageId,
        sessionsUsed: existing.sessionsUsed,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting patient package", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}