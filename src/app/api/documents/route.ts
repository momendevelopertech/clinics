import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    const documents = await prisma.document.findMany({
      where: {
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      documents.map((d: Prisma.DocumentGetPayload<{
        include: {
          patient: { select: { firstName: true; lastName: true } };
        };
      }>) => ({
        id: d.id,
        patientId: d.patientId,
        patientName: `${d.patient.firstName} ${d.patient.lastName}`,
        name: d.name,
        type: d.type,
        storageKey: d.storageKey,
        mimeType: d.mimeType,
        createdAt: d.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    logServerError("Error fetching documents", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const {
      patientId,
      type = body.documentType,
      name = body.fileName,
      storageKey = body.fileUrl,
      mimeType,
      procedureOrderId,
    } = body;

    if (!patientId || !type || !name) {
      return NextResponse.json(
        { error: "Patient ID, document type, and name are required" },
        { status: 400 },
      );
    }

    // Verify patient belongs to org
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (procedureOrderId) {
      const procedureOrder = await prisma.procedureOrder.findFirst({
        where: { id: procedureOrderId, organizationId: orgId, patientId },
        select: { id: true },
      });
      if (!procedureOrder) {
        return NextResponse.json({ error: "Procedure order not found for patient" }, { status: 400 });
      }
    }

    const document = await prisma.document.create({
      data: {
        organizationId: orgId,
        patientId,
        name,
        type,
        storageKey: storageKey || `documents/${patientId}/${Date.now()}`,
        mimeType,
        procedureOrderId: procedureOrderId ?? null,
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Document",
      entityId: document.id,
      afterState: JSON.stringify({
        patientId,
        type,
        name,
      }),
    });

    return NextResponse.json(
      {
        id: document.id,
        patientId: document.patientId,
        patientName: `${document.patient.firstName} ${document.patient.lastName}`,
        name: document.name,
        type: document.type,
        storageKey: document.storageKey,
        mimeType: document.mimeType,
        createdAt: document.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating document", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 },
    );
  }
}
