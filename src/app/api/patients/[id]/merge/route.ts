import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { patientMergeSchema } from "@/lib/validations";
import { mergePatientRecords } from "@/lib/patient-merge";
import { logServerError } from "@/lib/safe-logger";

/**
 * POST /api/patients/[id]/merge { survivorId }
 * Merges the duplicate patient [id] INTO survivorId: every linked record is
 * re-pointed inside one transaction, the duplicate is archived (never deleted),
 * and the merge is audit-logged. Children of moved parents (encounter notes,
 * prescription items, lab results, invoice lines) follow automatically via FK.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: duplicateId } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await getCurrentUserId(orgId);
    const canWrite = await hasPermission(userId, orgId, "patients:write", "patients");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = patientMergeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid merge payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { survivorId } = parsed.data;
    if (survivorId === duplicateId) {
      return NextResponse.json({ error: "Cannot merge a patient into itself" }, { status: 400 });
    }

    const [duplicate, survivor] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: duplicateId, organizationId: orgId },
        select: { id: true, firstName: true, lastName: true, mrn: true },
      }),
      prisma.patient.findFirst({
        where: { id: survivorId, organizationId: orgId },
        select: { id: true, firstName: true, lastName: true, mrn: true },
      }),
    ]);
    if (!duplicate || !survivor) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const merge = await mergePatientRecords(tx, {
        duplicateId,
        survivorId,
        organizationId: orgId,
      });
      await tx.patient.update({
        where: { id: duplicateId },
        data: { status: "Archived" },
      });
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "UPDATE",
          entityType: "PatientMerge",
          entityId: survivorId,
          beforeState: JSON.stringify({ duplicate, survivor }),
          afterState: JSON.stringify(merge),
        },
      });
      return merge;
    });

    return NextResponse.json({ survivorId, archivedId: duplicateId, ...result });
  } catch (error) {
    logServerError("Error merging patients", error);
    return NextResponse.json({ error: "Failed to merge patients" }, { status: 500 });
  }
}
