import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertOrgScope, getOrgId } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const userId = await getCurrentUserId(organizationId);
    if (!(await hasPermission(userId, organizationId, "patients:write", "patients"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body: unknown = await request.json().catch(() => ({}));
    const archived = typeof body === "object" && body !== null && "archived" in body
      ? (body as { archived?: unknown }).archived !== false
      : true;
    const existing = await prisma.patient.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const patient = await prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({ where: { id }, data: { status: archived ? "Archived" : "Active" } });
      await tx.auditLog.create({
        data: {
          organizationId, userId, action: "UPDATE", entityType: "PatientArchive", entityId: id,
          beforeState: JSON.stringify({ status: existing.status }), afterState: JSON.stringify({ status: updated.status }),
        },
      });
      return updated;
    });
    return NextResponse.json({ id: patient.id, status: patient.status });
  } catch {
    return NextResponse.json({ error: "Failed to update patient archive status" }, { status: 500 });
  }
}
