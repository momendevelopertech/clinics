import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { clinicalCatalogSchema, serviceCatalogSchema } from "@/lib/validations/catalog";

function kindFrom(request: Request) {
  return new URL(request.url).searchParams.get("kind");
}

async function requireOwnerContext() {
  const context = await requireOrgContext();
  const owner = await requireOwner({ json: true });
  if (!owner.ok) return { context, error: owner.response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { context, error: null };
}

/** Owner-only update of a catalog entry (Q3 full-catalog management). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { context, error } = await requireOwnerContext();
    if (error) return error;
    const kind = kindFrom(request);
    const body: unknown = await request.json().catch(() => ({}));

    if (kind === "service") {
      const parsed = serviceCatalogSchema.partial().safeParse(body);
      if (!parsed.success || Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: "Invalid catalog entry" }, { status: 400 });
      }
      const existing = await prisma.serviceCatalog.findFirst({
        where: { id, organizationId: context.organizationId },
      });
      if (!existing) return NextResponse.json({ error: "Catalog entry not found" }, { status: 404 });
      const updated = await prisma.serviceCatalog.update({ where: { id }, data: parsed.data });
      await createAuditLog({
        organizationId: context.organizationId,
        userId: context.userId,
        action: "UPDATE",
        entityType: "service_catalog",
        entityId: id,
        afterState: JSON.stringify(updated),
      });
      return NextResponse.json(updated);
    }

    if (kind === "clinical") {
      const parsed = clinicalCatalogSchema.partial().safeParse(body);
      if (!parsed.success || Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: "Invalid catalog entry" }, { status: 400 });
      }
      const existing = await prisma.clinicalCatalog.findFirst({
        where: { id, organizationId: context.organizationId },
      });
      if (!existing) return NextResponse.json({ error: "Catalog entry not found" }, { status: 404 });
      const updated = await prisma.clinicalCatalog.update({ where: { id }, data: parsed.data });
      await createAuditLog({
        organizationId: context.organizationId,
        userId: context.userId,
        action: "UPDATE",
        entityType: "clinical_catalog",
        entityId: id,
        afterState: JSON.stringify(updated),
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "kind must be service or clinical" }, { status: 400 });
  } catch (error) {
    logServerError("Error updating catalog entry", error);
    return NextResponse.json({ error: "Failed to update catalog entry" }, { status: 400 });
  }
}

/**
 * Owner-only delete. Service entries referenced by invoices/procedures/packages
 * are deactivated instead of hard-deleted to preserve history.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { context, error } = await requireOwnerContext();
    if (error) return error;
    const kind = kindFrom(request);

    if (kind === "service") {
      const existing = await prisma.serviceCatalog.findFirst({
        where: { id, organizationId: context.organizationId },
      });
      if (!existing) return NextResponse.json({ error: "Catalog entry not found" }, { status: 404 });
      const refs = await prisma.$transaction([
        prisma.invoiceLineItem.count({ where: { serviceCatalogId: id } }),
        prisma.procedureOrder.count({ where: { serviceCatalogId: id } }),
        prisma.servicePackage.count({ where: { serviceCatalogId: id } }),
      ]);
      if (refs.some((count) => count > 0)) {
        const deactivated = await prisma.serviceCatalog.update({
          where: { id },
          data: { active: false },
        });
        await createAuditLog({
          organizationId: context.organizationId,
          userId: context.userId,
          action: "UPDATE",
          entityType: "service_catalog",
          entityId: id,
          afterState: JSON.stringify({ active: false, referenced: true }),
        });
        return NextResponse.json({ ...deactivated, deactivated: true });
      }
      await prisma.serviceCatalog.delete({ where: { id } });
      await createAuditLog({
        organizationId: context.organizationId,
        userId: context.userId,
        action: "DELETE",
        entityType: "service_catalog",
        entityId: id,
      });
      return NextResponse.json({ ok: true });
    }

    if (kind === "clinical") {
      const existing = await prisma.clinicalCatalog.findFirst({
        where: { id, organizationId: context.organizationId },
      });
      if (!existing) return NextResponse.json({ error: "Catalog entry not found" }, { status: 404 });
      await prisma.clinicalCatalog.delete({ where: { id } });
      await createAuditLog({
        organizationId: context.organizationId,
        userId: context.userId,
        action: "DELETE",
        entityType: "clinical_catalog",
        entityId: id,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "kind must be service or clinical" }, { status: 400 });
  } catch (error) {
    logServerError("Error deleting catalog entry", error);
    return NextResponse.json({ error: "Failed to delete catalog entry" }, { status: 400 });
  }
}
