import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { labResultSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;

    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:read", resource: "encounters" },
      { action: "lab:read", resource: "lab" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    // LabResult is scoped via patient who belongs to org
    const labResults = await prisma.labResult.findMany({
      where: {
        patient: { organizationId: orgId },
        ...(patientId ? { patientId } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        order: { select: { id: true, orderType: true, priority: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      labResults.map((l: Prisma.LabResultGetPayload<{
        include: {
          patient: { select: { firstName: true; lastName: true } };
          order: { select: { id: true; orderType: true; priority: true; status: true } };
        };
      }>) => ({
        id: l.id,
        patientId: l.patientId,
        patientName: `${l.patient.firstName} ${l.patient.lastName}`,
        testName: l.testName,
        resultValue: l.resultValue,
        unit: l.unit,
        referenceRange: l.referenceRange,
        status: l.status,
        performedAt: l.performedAt?.toISOString() ?? null,
        reportUrl: l.reportUrl,
        order: l.order,
        createdAt: l.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    logServerError("Error fetching lab results", error);
    return NextResponse.json(
      { error: "Failed to fetch lab results" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
    const { userId } = authz;

    const parsed = labResultSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { orderId, patientId, testName, resultValue, unit, referenceRange, status, performedAt, reportUrl } = parsed.data;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (orderId) {
      const order = await prisma.labOrder.findFirst({ where: { id: orderId, organizationId: orgId, patientId }, select: { id: true, status: true } });
      if (!order) return NextResponse.json({ error: "Lab order not found for patient" }, { status: 400 });
      if (order.status === "cancelled" || order.status === "reviewed") return NextResponse.json({ error: "This lab order cannot receive results" }, { status: 409 });
    }

    const labResult = await prisma.$transaction(async (tx) => {
      const result = await tx.labResult.create({
      data: {
        organizationId: orgId,
        patientId,
        orderId: orderId ?? null,
        testName,
        resultValue: resultValue ?? null,
        unit: unit ?? null,
        referenceRange: referenceRange ?? null,
        status: status ?? "pending",
        performedAt: performedAt ? new Date(performedAt) : null,
        reportUrl: reportUrl ?? null,
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
      });
      if (orderId) await tx.labOrder.update({ where: { id: orderId }, data: { status: "resulted" } });
      return result;
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "LabResult",
      entityId: labResult.id,
      afterState: JSON.stringify({ patientId, orderId, testName, status }),
    });

    return NextResponse.json(
      {
        id: labResult.id,
        patientId: labResult.patientId,
        patientName: `${labResult.patient.firstName} ${labResult.patient.lastName}`,
        testName: labResult.testName,
        resultValue: labResult.resultValue,
        unit: labResult.unit,
        referenceRange: labResult.referenceRange,
        status: labResult.status,
        performedAt: labResult.performedAt?.toISOString() ?? null,
        orderId: labResult.orderId,
        createdAt: labResult.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating lab result", error);
    return NextResponse.json(
      { error: "Failed to create lab result" },
      { status: 500 },
    );
  }
}
