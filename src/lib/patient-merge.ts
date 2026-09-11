import type { Prisma } from "@prisma/client";

// Tables carrying (organizationId, patientId): re-pointed duplicate -> survivor.
const SCOPED_TABLES = [
  "appointment",
  "encounter",
  "prescription",
  "diagnosis",
  "followUp",
  "labResult",
  "labOrder",
  "procedureOrder",
  "invoice",
  "insuranceClaim",
  "consent",
  "document",
  "communication",
  "task",
  "waitlistEntry",
  "patientHistory",
] as const;

// Tables carrying patientId only (no organizationId column).
const UNSCOPED_TABLES = ["vital", "insurancePolicy", "feedbackSurvey"] as const;

type LooseTx = Record<
  string,
  {
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
    deleteMany?: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
    findFirst?: (args: unknown) => Promise<{ id: string } | null>;
  }
>;

export interface PatientMergeResult {
  moved: Record<string, number>;
  emergencyContact: "moved" | "dropped-duplicate" | "none";
  sessionsRevoked: number;
}

/**
 * Re-points every duplicate-owned row to the survivor inside the caller's
 * transaction. UPDATE-only for clinical data (nothing copied, nothing deleted)
 * except: EmergencyContact (unique per patient — survivor wins on conflict) and
 * PatientSession (identity-bound — duplicate's sessions revoked).
 * AuditLog rows are append-only history and are intentionally left untouched.
 */
export async function mergePatientRecords(
  tx: Prisma.TransactionClient,
  args: { duplicateId: string; survivorId: string; organizationId: string },
): Promise<PatientMergeResult> {
  const { duplicateId, survivorId, organizationId } = args;
  if (!duplicateId || !survivorId || duplicateId === survivorId) {
    throw new Error("Cannot merge a patient into itself");
  }
  const db = tx as unknown as LooseTx;
  const moved: Record<string, number> = {};

  for (const table of SCOPED_TABLES) {
    const r = await db[table].updateMany({
      where: { organizationId, patientId: duplicateId },
      data: { patientId: survivorId },
    });
    moved[table] = r.count;
  }
  for (const table of UNSCOPED_TABLES) {
    const r = await db[table].updateMany({
      where: { patientId: duplicateId },
      data: { patientId: survivorId },
    });
    moved[table] = r.count;
  }

  const survivorContact = await db.emergencyContact.findFirst?.({
    where: { patientId: survivorId },
    select: { id: true },
  });
  let emergencyContact: PatientMergeResult["emergencyContact"];
  if (survivorContact) {
    await db.emergencyContact.deleteMany?.({ where: { patientId: duplicateId } });
    emergencyContact = "dropped-duplicate";
  } else {
    const r = await db.emergencyContact.updateMany({
      where: { patientId: duplicateId },
      data: { patientId: survivorId },
    });
    emergencyContact = r.count > 0 ? "moved" : "none";
  }

  const sessions = await db.patientSession.deleteMany?.({
    where: { patientId: duplicateId },
  });
  return { moved, emergencyContact, sessionsRevoked: sessions?.count ?? 0 };
}
