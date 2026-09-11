import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { patientPackageCreateSchema } from "@/lib/validations";

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

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const rows = await prisma.patientPackage.findMany({
      where: {
        organizationId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        package: { select: { id: true, name: true, totalSessions: true } },
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

/** Assign a package to a patient (sessions balance starts full). */
export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(context.organizationId, "catalogs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(context.organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const parsed = patientPackageCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const [patient, pkg] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: parsed.data.patientId, organizationId: context.organizationId },
        select: { id: true },
      }),
      prisma.servicePackage.findFirst({
        where: { id: parsed.data.packageId, organizationId: context.organizationId, active: true },
      }),
    ]);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    if (!pkg) return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 });

    const created = await prisma.patientPackage.create({
      data: {
        organizationId: context.organizationId,
        patientId: patient.id,
        packageId: pkg.id,
        sessionsTotal: pkg.totalSessions,
        sessionsUsed: 0,
        status: "active",
        pricePaid: parsed.data.pricePaid ?? pkg.price,
      },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "PatientPackage",
      entityId: created.id,
      afterState: JSON.stringify({ patientId: patient.id, packageId: pkg.id }),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logServerError("Error assigning package", error);
    return NextResponse.json({ error: "Failed to assign package" }, { status: 500 });
  }
}
