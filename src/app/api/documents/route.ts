import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { documentCreateSchema } from "@/lib/validations/uploads";
import { mintDocumentDownloadToken } from "@/lib/signed-urls";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "documents");
    if (moduleAuthz.response) return moduleAuthz.response;

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
        downloadUrl: `/api/documents/${d.id}/download?token=${encodeURIComponent(
          mintDocumentDownloadToken({ orgId, documentId: d.id }),
        )}`,
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
    const moduleAuthz = await requireModulePermission(orgId, "documents");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const parsed = documentCreateSchema.safeParse({
      patientId: body.patientId,
      type: body.type ?? body.documentType,
      name: body.name ?? body.fileName,
      storageKey: body.storageKey ?? body.fileUrl,
      mimeType: body.mimeType ?? null,
      procedureOrderId: body.procedureOrderId ?? null,
      publicId: body.publicId ?? null,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid document payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { patientId, type, name, storageKey, mimeType, procedureOrderId, publicId } =
      parsed.data;

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
        storageKey,
        publicId: publicId ?? null,
        mimeType: mimeType ?? null,
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
        publicId,
        storageKey,
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
