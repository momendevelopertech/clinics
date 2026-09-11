import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { servicePackageCreateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const { organizationId } = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(organizationId, "catalogs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "patients:read", resource: "patients" },
      { action: "appointments:read", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const activeOnly = new URL(request.url).searchParams.get("active") === "true";
    const packages = await prisma.servicePackage.findMany({
      where: { organizationId, ...(activeOnly ? { active: true } : {}) },
      include: { serviceCatalog: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(
      packages.map((p) => ({ ...p, price: p.price.toString() })),
    );
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(context.organizationId, "catalogs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(context.organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const parsed = servicePackageCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid package", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (parsed.data.serviceCatalogId) {
      const catalog = await prisma.serviceCatalog.findFirst({
        where: { id: parsed.data.serviceCatalogId, organizationId: context.organizationId },
        select: { id: true },
      });
      if (!catalog) return NextResponse.json({ error: "Service not found" }, { status: 400 });
    }
    const created = await prisma.servicePackage.create({
      data: {
        organizationId: context.organizationId,
        name: parsed.data.name,
        serviceCatalogId: parsed.data.serviceCatalogId ?? null,
        procedureName: parsed.data.procedureName || null,
        totalSessions: parsed.data.totalSessions,
        price: parsed.data.price,
      },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "ServicePackage",
      entityId: created.id,
      afterState: JSON.stringify({ name: created.name, totalSessions: created.totalSessions }),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logServerError("Error creating package", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}
