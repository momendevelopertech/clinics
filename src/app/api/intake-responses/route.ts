import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";

/** Staff view of submitted intake responses (read-only). */
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
    const formId = searchParams.get("formId");
    const rows = await prisma.intakeResponse.findMany({
      where: {
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
        ...(formId ? { formId } : {}),
      },
      include: {
        form: { select: { name: true, fields: { orderBy: { position: "asc" } } } },
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(rows);
  } catch (error) {
    logServerError("Error fetching intake responses", error);
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
  }
}
