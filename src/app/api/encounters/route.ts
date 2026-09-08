import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { encounterCreateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;

    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    const encounters = await prisma.encounter.findMany({
      where: {
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        appointment: true,
        notes: true,
      },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(encounters);
  } catch (error) {
    logServerError("Error fetching encounters", error);
    return NextResponse.json(
      { error: "Failed to fetch encounters" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = encounterCreateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { patientId, appointmentId, encounterType } = parsed.data;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, organizationId: orgId, patientId } });
      if (!appointment) return NextResponse.json({ error: "Appointment not found for patient" }, { status: 400 });
    }

    const encounter = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const enc = await tx.encounter.create({
        data: {
          organizationId: orgId,
          patientId,
          appointmentId: appointmentId || null,
          startTime: new Date(),
          status: "in_progress",
          encounterType: encounterType || "office_visit",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "Encounter",
          entityId: enc.id,
          afterState: JSON.stringify(enc),
        },
      });

      return enc;
      },
    );

    return NextResponse.json(encounter, { status: 201 });
  } catch (error) {
    logServerError("Error creating encounter", error);
    return NextResponse.json(
      { error: "Failed to create encounter" },
      { status: 500 },
    );
  }
}
