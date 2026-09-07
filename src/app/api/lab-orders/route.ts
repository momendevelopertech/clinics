import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { createAuditLog } from "@/lib/audit";
import { labOrderSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const patientId = new URL(request.url).searchParams.get("patientId");
    const orders = await prisma.labOrder.findMany({
      where: { organizationId, ...(patientId ? { patientId } : {}) },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        results: true,
      },
      orderBy: { orderedAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    logServerError("Error fetching lab orders", error);
    return NextResponse.json({ error: "Failed to fetch lab orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const authz = await requireAnyPermission(organizationId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const parsed = labOrderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, organizationId }, select: { id: true } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    if (data.encounterId) {
      const encounter = await prisma.encounter.findFirst({ where: { id: data.encounterId, organizationId, patientId: data.patientId }, select: { id: true } });
      if (!encounter) return NextResponse.json({ error: "Encounter not found for patient" }, { status: 400 });
    }
    const order = await prisma.labOrder.create({ data: { ...data, organizationId, orderedById: authz.userId } });
    await createAuditLog({ organizationId, userId: authz.userId, action: "CREATE", entityType: "LabOrder", entityId: order.id, afterState: JSON.stringify(order) });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    logServerError("Error creating lab order", error);
    return NextResponse.json({ error: "Failed to create lab order" }, { status: 500 });
  }
}
