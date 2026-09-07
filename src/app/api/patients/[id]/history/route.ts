import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertOrgScope, getOrgId } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { patientHistorySchema } from "@/lib/validations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const patient = await prisma.patient.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    return NextResponse.json(await prisma.patientHistory.findMany({ where: { patientId: id, organizationId }, orderBy: { createdAt: "desc" } }));
  } catch {
    return NextResponse.json({ error: "Failed to fetch patient history" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const organizationId = await getOrgId();
    assertOrgScope(organizationId);
    const userId = await getCurrentUserId(organizationId);
    if (!(await hasPermission(userId, organizationId, "patients:write", "patients"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const patient = await prisma.patient.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const parsed = patientHistorySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const history = await prisma.$transaction(async (tx) => {
      const created = await tx.patientHistory.create({
        data: {
          organizationId,
          patientId: id,
          ...parsed.data,
          onsetDate: parsed.data.onsetDate ? new Date(parsed.data.onsetDate) : null,
          resolvedAt: parsed.data.resolvedAt ? new Date(parsed.data.resolvedAt) : null,
        },
      });
      await tx.auditLog.create({
        data: { organizationId, userId, action: "CREATE", entityType: "PatientHistory", entityId: created.id, afterState: JSON.stringify(created) },
      });
      return created;
    });
    return NextResponse.json(history, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create patient history" }, { status: 500 });
  }
}
