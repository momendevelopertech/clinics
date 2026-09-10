import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { consentCreateSchema } from "@/lib/validations/ops";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "consents");
    if (moduleAuthz.response) return moduleAuthz.response;

    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:read", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    const consents = await prisma.consent.findMany({
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
      consents.map((c: Prisma.ConsentGetPayload<{
        include: {
          patient: { select: { firstName: true; lastName: true } };
        };
      }>) => ({
        id: c.id,
        patientId: c.patientId,
        patientName: `${c.patient.firstName} ${c.patient.lastName}`,
        consentType: c.consentType,
        isGranted: c.isGranted,
        documentUrl: c.documentUrl,
        signedAt: c.signedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    logServerError("Error fetching consents", error);
    return NextResponse.json(
      { error: "Failed to fetch consents" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "consents");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = consentCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid consent payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { patientId, consentType, isGranted, signedAt, documentUrl } = parsed.data;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const consent = await prisma.consent.create({
      data: {
        patientId,
        organizationId: orgId,
        consentType,
        isGranted: isGranted ?? true,
        signedAt: signedAt ? new Date(signedAt) : new Date(),
        documentUrl: documentUrl ?? null,
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Consent",
      entityId: consent.id,
      afterState: JSON.stringify({ patientId, consentType, isGranted }),
    });

    return NextResponse.json(
      {
        id: consent.id,
        patientId: consent.patientId,
        patientName: `${consent.patient.firstName} ${consent.patient.lastName}`,
        consentType: consent.consentType,
        isGranted: consent.isGranted,
        signedAt: consent.signedAt?.toISOString() ?? null,
        createdAt: consent.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating consent", error);
    return NextResponse.json(
      { error: "Failed to create consent" },
      { status: 500 },
    );
  }
}
