import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { clinicalCatalogSchema, serviceCatalogSchema } from "@/lib/validations/catalog";

function kindFrom(request: Request) {
  return new URL(request.url).searchParams.get("kind");
}

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
    const kind = kindFrom(request);
    if (kind === "clinical") {
      return NextResponse.json(await prisma.clinicalCatalog.findMany({ where: { organizationId }, orderBy: [{ category: "asc" }, { name: "asc" }] }));
    }
    if (kind === "service") {
      const services = await prisma.serviceCatalog.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
      return NextResponse.json(services.map((service) => ({ ...service, price: service.price.toString() })));
    }
    return NextResponse.json({ error: "kind must be service or clinical" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return owner.response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const kind = kindFrom(request);
    const body: unknown = await request.json();
    if (kind !== "clinical" && kind !== "service") {
      return NextResponse.json({ error: "Invalid catalog entry" }, { status: 400 });
    }
    const entry = kind === "clinical"
      ? (() => {
          const parsed = clinicalCatalogSchema.safeParse(body);
          return parsed.success
            ? prisma.clinicalCatalog.create({ data: { ...parsed.data, organizationId: context.organizationId } })
            : null;
        })()
      : (() => {
          const parsed = serviceCatalogSchema.safeParse(body);
          return parsed.success
            ? prisma.serviceCatalog.create({ data: { ...parsed.data, organizationId: context.organizationId, price: parsed.data.price } })
            : null;
        })();
    if (!entry) return NextResponse.json({ error: "Invalid catalog entry" }, { status: 400 });
    const created = await entry;
    await createAuditLog({ organizationId: context.organizationId, userId: context.userId, action: "CREATE", entityType: `${kind}_catalog`, entityId: created.id, afterState: JSON.stringify(created) });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create catalog entry" }, { status: 400 });
  }
}
