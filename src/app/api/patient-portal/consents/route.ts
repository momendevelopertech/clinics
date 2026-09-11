import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { createAuditLog } from "@/lib/audit";
import {
  REQUIRED_PATIENT_CONSENT_TYPES,
  patientConsentSignSchema,
} from "@/lib/validations/ops";

/** Patient's own consent status across the required intake types. */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signed = await prisma.consent.findMany({
      where: {
        patientId: session.patient.id,
        consentType: { in: [...REQUIRED_PATIENT_CONSENT_TYPES] },
      },
      select: { consentType: true, isGranted: true, signedAt: true },
      orderBy: { createdAt: "desc" },
    });
    const latestByType = new Map<string, (typeof signed)[number]>();
    for (const c of signed) {
      if (!latestByType.has(c.consentType)) latestByType.set(c.consentType, c);
    }

    return NextResponse.json({
      consents: REQUIRED_PATIENT_CONSENT_TYPES.map((type) => {
        const record = latestByType.get(type);
        return {
          type,
          granted: record?.isGranted ?? false,
          signedAt: record?.signedAt?.toISOString() ?? null,
        };
      }),
    });
  } catch (error) {
    logServerError("Patient portal consents error", error);
    return NextResponse.json({ error: "Failed to fetch consents" }, { status: 500 });
  }
}

/** Patient signs (or declines) a required intake consent. */
export async function POST(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = patientConsentSignSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid consent", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const consent = await prisma.consent.create({
      data: {
        patientId: session.patient.id,
        organizationId: session.patient.organizationId,
        consentType: parsed.data.consentType,
        isGranted: parsed.data.isGranted,
        signedAt: new Date(),
      },
      select: { consentType: true, isGranted: true, signedAt: true },
    });

    await createAuditLog({
      organizationId: session.patient.organizationId,
      action: "CREATE",
      entityType: "Consent",
      entityId: `${session.patient.id}:${consent.consentType}`,
      actorType: "patient",
      actorIdentifier: session.patient.id,
      afterState: JSON.stringify({ type: consent.consentType, granted: consent.isGranted }),
    });

    return NextResponse.json(
      {
        type: consent.consentType,
        granted: consent.isGranted,
        signedAt: consent.signedAt?.toISOString() ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Patient sign consent error", error);
    return NextResponse.json({ error: "Failed to save consent" }, { status: 500 });
  }
}
