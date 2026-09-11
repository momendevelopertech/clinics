import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { labResultSchema } from "@/lib/validations";
import { buildDiagnosticRequest, mintExternalRef } from "@/lib/lab-exchange";

async function guard(orgId: string) {
  const moduleAuthz = await requireModulePermission(orgId, "labs");
  if (moduleAuthz.response) return null;
  const authz = await requireAnyPermission(orgId, [
    { action: "encounters:write", resource: "encounters" },
    { action: "patients:write", resource: "patients" },
  ]);
  if (authz.response) return null;
  return authz.userId as string;
}

/**
 * POST /api/lab-orders/[id]/transmit — stamps the order transmitted, mints
 * the externalRef the lab quotes back, and returns the FHIR-shaped e-order
 * payload for the clinic to hand to its lab. Idempotent per order.
 */
export async function transmitPOST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await guard(orgId);
    if (!userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const order = await prisma.labOrder.findFirst({
      where: { id, organizationId: orgId },
      include: { patient: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status === "cancelled" || order.status === "reviewed") {
      return NextResponse.json(
        { error: `Orders in status ${order.status} cannot be transmitted` },
        { status: 409 },
      );
    }
    const externalRef = order.externalRef ?? mintExternalRef();
    const updated = await prisma.labOrder.update({
      where: { id },
      data: { transmittedAt: order.transmittedAt ?? new Date(), externalRef },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "LabOrder",
      entityId: id,
      beforeState: JSON.stringify({ transmittedAt: order.transmittedAt }),
      afterState: JSON.stringify({ transmittedAt: updated.transmittedAt, externalRef }),
    });
    const payload = buildDiagnosticRequest(
      {
        id: order.id,
        externalRef,
        orderType: order.orderType,
        testName: order.testName,
        priority: order.priority,
        indication: order.indication,
        orderedAt: order.orderedAt,
      },
      {
        id: order.patient.id,
        firstName: order.patient.firstName,
        lastName: order.patient.lastName,
        mrn: order.patient.mrn,
        dateOfBirth: order.patient.dateOfBirth,
        gender: order.patient.gender,
      },
      orgId,
    );
    return NextResponse.json({ order: updated, externalRef, payload });
  } catch (error) {
    logServerError("Lab transmit failed", error);
    return NextResponse.json({ error: "Transmit failed" }, { status: 500 });
  }
}

const ingestSchema = labResultSchema.omit({ orderId: true, patientId: true });

/**
 * POST /api/lab-orders/[id]/ingest { resultValue, unit?, referenceRange?,
 * status?, performedAt? } — records the lab's returned result against the
 * order and flips it to resulted. Mirrors POST /api/labs guards.
 */
export async function ingestPOST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await guard(orgId);
    if (!userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = ingestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const order = await prisma.labOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status === "cancelled" || order.status === "reviewed") {
      return NextResponse.json(
        { error: `Orders in status ${order.status} cannot receive results` },
        { status: 409 },
      );
    }
    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.labResult.create({
        data: {
          organizationId: orgId,
          patientId: order.patientId,
          orderId: order.id,
          testName: parsed.data.testName ?? order.testName,
          resultValue: parsed.data.resultValue ?? null,
          unit: parsed.data.unit ?? null,
          referenceRange: parsed.data.referenceRange ?? null,
          status: parsed.data.status ?? "completed",
          performedAt: parsed.data.performedAt ? new Date(parsed.data.performedAt) : null,
        },
      });
      const updated = await tx.labOrder.update({
        where: { id },
        data: { status: "resulted" },
      });
      return { result, updated };
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "LabResult",
      entityId: created.result.id,
      afterState: JSON.stringify({ orderId: id, testName: created.result.testName }),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logServerError("Lab ingest failed", error);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
