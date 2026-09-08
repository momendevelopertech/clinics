import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const entries = await prisma.waitlistEntry.findMany({
      where: { organizationId: orgId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      entries.map((e: Prisma.WaitlistEntryGetPayload<{
        include: {
          patient: {
            select: { firstName: true; lastName: true; phone: true; email: true };
          };
        };
      }>) => ({
        id: e.id,
        patientId: e.patientId,
        patientName: `${e.patient.firstName} ${e.patient.lastName}`,
        patientPhone: e.patient.phone,
        patientEmail: e.patient.email,
        preferredDate: e.preferredDate?.toISOString() ?? null,
        notes: e.notes,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    logServerError("Error fetching waitlist", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
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
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const { patientId, preferredDate, notes } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId is required" },
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

    const entry = await prisma.waitlistEntry.create({
      data: {
        organizationId: orgId,
        patientId,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        notes: notes ?? null,
        status: "waiting",
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "WaitlistEntry",
      entityId: entry.id,
      afterState: JSON.stringify({ patientId, status: "waiting" }),
    });

    return NextResponse.json(
      {
        id: entry.id,
        patientId: entry.patientId,
        patientName: `${entry.patient.firstName} ${entry.patient.lastName}`,
        preferredDate: entry.preferredDate?.toISOString() ?? null,
        notes: entry.notes,
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating waitlist entry", error);
    return NextResponse.json(
      { error: "Failed to add to waitlist" },
      { status: 500 },
    );
  }
}
