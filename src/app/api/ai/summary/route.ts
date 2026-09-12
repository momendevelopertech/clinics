import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { completeChat, isAiEnabled } from "@/lib/ai";
import {
  buildStructuredVisitSummary,
  buildSummaryPrompt,
} from "@/lib/ai-clinical";
import { z } from "zod";

const summarySchema = z.object({
  encounterId: z.string().min(1),
});

/**
 * POST /api/ai/summary — patient-readable visit summary.
 *
 * The deterministic structured summary is always computed from live clinical
 * data (honest, no hallucination). When an AI provider is configured, a
 * natural-language summary is added on top; otherwise `ai` is omitted and the
 * UI falls back to the structured view.
 */
export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = summarySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid encounter id" }, { status: 400 });
    }

    const encounter = await prisma.encounter.findFirst({
      where: { id: parsed.data.encounterId, organizationId: orgId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        vitals: { orderBy: { recordedAt: "desc" }, take: 1 },
        diagnoses: { select: { name: true } },
        prescriptions: { select: { medicationName: true, dosage: true } },
        notes: {
          select: { text: true, subjective: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const latestVital = encounter.vitals[0];
    const noteText = encounter.notes[0];
    const structured = buildStructuredVisitSummary({
      patientName: `${encounter.patient.firstName} ${encounter.patient.lastName}`,
      reason: encounter.encounterType,
      startTime: encounter.startTime,
      vitals: latestVital
        ? {
            temperature: latestVital.temperature,
            bloodPressureSystolic: latestVital.bloodPressureSystolic,
            bloodPressureDiastolic: latestVital.bloodPressureDiastolic,
            heartRate: latestVital.heartRate,
            spO2: latestVital.spO2,
          }
        : null,
      diagnoses: encounter.diagnoses.map((d) => d.name),
      medications: encounter.prescriptions.map((p) =>
        p.dosage ? `${p.medicationName} ${p.dosage}` : p.medicationName,
      ),
      notes: noteText?.text ?? noteText?.subjective ?? null,
    });

    let ai: string | null = null;
    if (isAiEnabled()) {
      const result = await completeChat(
        buildSummaryPrompt({
          patientName: `${encounter.patient.firstName} ${encounter.patient.lastName}`,
          structured,
        }),
      );
      if (result.ok) ai = result.content;
    }

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "AiSummary",
      entityId: encounter.id,
      afterState: JSON.stringify({ ai: Boolean(ai), structured: true }),
    });

    return NextResponse.json({ ok: true, structured, ai });
  } catch (error) {
    logServerError("AI summary failed", error);
    return NextResponse.json({ error: "AI summary failed" }, { status: 500 });
  }
}