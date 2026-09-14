import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { insuranceProviderSchema } from "@/lib/validations/billing";

async function requireOwnerContext() {
  const context = await requireOrgContext();
  const owner = await requireOwner({ json: true });
  if (!owner.ok) return { context, error: owner.response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { context, error: null };
}

/** Owner-only update. Policies store the provider name, so renames cascade. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { context, error } = await requireOwnerContext();
    if (error) return error;

    const parsed = insuranceProviderSchema.partial().safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    const existing = await prisma.insuranceProvider.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.insuranceProvider.update({ where: { id }, data: parsed.data });
      if (parsed.data.name && parsed.data.name !== existing.name) {
        await tx.insurancePolicy.updateMany({
          where: { provider: existing.name, patient: { organizationId: context.organizationId } },
          data: { provider: parsed.data.name },
        });
      }
      return next;
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "UPDATE",
      entityType: "InsuranceProvider",
      entityId: id,
      afterState: JSON.stringify(updated),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Update insurance provider error", error);
    return NextResponse.json({ error: "Failed to update provider" }, { status: 400 });
  }
}

/** Owner-only delete. Providers used by policies are deactivated instead. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { context, error } = await requireOwnerContext();
    if (error) return error;

    const existing = await prisma.insuranceProvider.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const used = await prisma.insurancePolicy.count({
      where: { provider: existing.name, patient: { organizationId: context.organizationId } },
    });
    if (used > 0) {
      const deactivated = await prisma.insuranceProvider.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ ...deactivated, deactivated: true });
    }

    await prisma.insuranceProvider.delete({ where: { id } });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "DELETE",
      entityType: "InsuranceProvider",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Delete insurance provider error", error);
    return NextResponse.json({ error: "Failed to delete provider" }, { status: 400 });
  }
}
