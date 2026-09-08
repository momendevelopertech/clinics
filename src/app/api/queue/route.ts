import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const moduleAuthz = await requireModulePermission(organizationId, "queue");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const queue = await prisma.appointment.findMany({
      where: {
        organizationId,
        startTime: { gte: start, lt: end },
        status: { in: ["arrived", "in_progress"] },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        provider: { select: { id: true, name: true } },
        room: { select: { id: true, name: true, number: true } },
      },
      orderBy: [{ status: "desc" }, { tokenNumber: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(queue);
  } catch {
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }
}
