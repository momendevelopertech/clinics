import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { procedureOrderSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const patientId = new URL(request.url).searchParams.get("patientId");
    const orders = await prisma.procedureOrder.findMany({
      where: { organizationId, ...(patientId ? { patientId } : {}) },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        serviceCatalog: { select: { code: true, name: true, price: true } },
        documents: { select: { id: true, name: true, type: true, mimeType: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    logServerError("Error fetching procedure orders", error);
    return NextResponse.json({ error: "Failed to fetch procedure orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const parsed = procedureOrderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, organizationId }, select: { id: true } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    if (data.encounterId) {
      const encounter = await prisma.encounter.findFirst({ where: { id: data.encounterId, organizationId, patientId: data.patientId }, select: { id: true } });
      if (!encounter) return NextResponse.json({ error: "Encounter not found for patient" }, { status: 400 });
    }
    if (data.serviceCatalogId) {
      const catalog = await prisma.serviceCatalog.findFirst({ where: { id: data.serviceCatalogId, organizationId, active: true }, select: { id: true } });
      if (!catalog) return NextResponse.json({ error: "Active service catalog item not found" }, { status: 400 });
    }
    const order = await prisma.procedureOrder.create({ data: { ...data, organizationId, orderedById: authz.userId, scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null } });
    await createAuditLog({ organizationId, userId: authz.userId, action: "CREATE", entityType: "ProcedureOrder", entityId: order.id, afterState: JSON.stringify(order) });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    logServerError("Error creating procedure order", error);
    return NextResponse.json({ error: "Failed to create procedure order" }, { status: 500 });
  }
}
