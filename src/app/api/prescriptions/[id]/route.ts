import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  sentToPharmacy: z.boolean().optional(),
});

/**
 * Prescription lifecycle:
 *  - PATCH  sets status (active|completed|cancelled) and/or sentToPharmacy.
 *  - DELETE hard-deletes ONLY a cancelled Rx (medical records are not
 *    destroyed while clinically relevant). Any other state → 409.
 *
 * Both operations are owner-org scoped and audited.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const { id } = await params;

    const existing = await prisma.prescription.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    const updated = await prisma.prescription.update({
      where: { id },
      data: { ...parsed.data },
      select: { id: true, status: true, sentToPharmacy: true },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: authz.userId,
      action: "UPDATE",
      entityType: "Prescription",
      entityId: id,
      afterState: JSON.stringify(parsed.data),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating prescription", error);
    return NextResponse.json(
      { error: "Failed to update prescription" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const { id } = await params;
    const existing = await prisma.prescription.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }
    if (existing.status !== "cancelled") {
      return NextResponse.json(
        { error: "Only a cancelled prescription can be deleted" },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
      await tx.prescription.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: authz.userId,
          action: "DELETE",
          entityType: "Prescription",
          entityId: id,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting prescription", error);
    return NextResponse.json(
      { error: "Failed to delete prescription" },
      { status: 500 },
    );
  }
}