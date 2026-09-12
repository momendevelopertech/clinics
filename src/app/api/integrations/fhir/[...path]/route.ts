import { NextResponse } from "next/server";
import { requireOrgContext, isAuthContextError } from "@/lib/org";
import { hasPermission } from "@/lib/auth";
import { logServerError } from "@/lib/safe-logger";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, extractBearerToken } from "@/lib/api-keys";
import { deliverWebhook } from "@/lib/webhook-delivery";
import { createAuditLog } from "@/lib/audit";
import {
  parseFhirPatient,
  parseFhirObservation,
  buildFhirResourceResponse,
  type FhirResourceInput,
} from "@/lib/fhir-write";

export const runtime = "nodejs";

const FHIR_ID_PATTERN = /^[A-Za-z0-9.-]{1,64}$/;
const PATIENT_REFERENCE_PATTERN = /^Patient\/([A-Za-z0-9.-]{1,64})$/;

function getPatientReferenceId(value: string) {
  return PATIENT_REFERENCE_PATTERN.exec(value)?.[1] ?? null;
}

const ALLOWED_FHIR_COLLECTIONS = {
  AllergyIntolerance: ["patient", "_count"],
  Appointment: ["patient", "date", "status", "_count"],
  Condition: ["patient", "clinical-status", "_count"],
  DiagnosticReport: ["patient", "category", "status", "_count"],
  Encounter: ["patient", "_count"],
  MedicationRequest: ["patient", "status", "_count"],
  Observation: ["subject", "code", "date", "_count"],
} as const;

function getFhirBaseUrl() {
  return process.env.FHIR_BASE_URL?.replace(/\/+$/, "") ?? "";
}

function buildFhirUrl(pathSegments: string[], requestUrl: string) {
  const upstream = new URL(`${getFhirBaseUrl()}/${pathSegments.join("/")}`);
  const incomingUrl = new URL(requestUrl);

  incomingUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value);
  });

  return upstream.toString();
}

function isValidPatientReference(value: string) {
  return getPatientReferenceId(value) !== null;
}

function validateFhirPath(path: string[], requestUrl: string) {
  const [resourceType, resourceId, ...rest] = path;

  if (!resourceType) {
    return { error: "FHIR path is required", status: 400 };
  }

  if (resourceType === "Patient") {
    if (!resourceId || rest.length > 0 || !FHIR_ID_PATTERN.test(resourceId)) {
      return {
        error: "Only direct Patient/{id} reads are allowed",
        status: 403,
      };
    }

    const incomingUrl = new URL(requestUrl);
    if (Array.from(incomingUrl.searchParams.keys()).length > 0) {
      return {
        error: "Patient reads do not allow arbitrary query params",
        status: 403,
      };
    }

    return null;
  }

  const allowedParams = ALLOWED_FHIR_COLLECTIONS[
    resourceType as keyof typeof ALLOWED_FHIR_COLLECTIONS
  ];

  if (!allowedParams || resourceId || rest.length > 0) {
    return {
      error: "FHIR path is outside the allowed read-only proxy scope",
      status: 403,
    };
  }

  const incomingUrl = new URL(requestUrl);
  const params = Array.from(incomingUrl.searchParams.entries());

  for (const [key, value] of params) {
    if (!allowedParams.includes(key as never)) {
      return {
        error: `FHIR query parameter '${key}' is not allowed for ${resourceType}`,
        status: 403,
      };
    }

    if (
      (key === "patient" || key === "subject") &&
      !isValidPatientReference(value)
    ) {
      return {
        error: `FHIR query parameter '${key}' must be a Patient/<id> reference`,
        status: 400,
      };
    }
  }

  const hasPatientScope = params.some(
    ([key]) => key === "patient" || key === "subject",
  );

  if (!hasPatientScope) {
    return {
      error: `${resourceType} reads must be explicitly scoped to a patient reference`,
      status: 403,
    };
  }

  return null;
}

function getReferencedPatientIds(path: string[], requestUrl: string) {
  const [resourceType, resourceId] = path;

  if (resourceType === "Patient" && resourceId) {
    return [resourceId];
  }

  const incomingUrl = new URL(requestUrl);
  const ids = new Set<string>();

  for (const key of ["patient", "subject"] as const) {
    for (const value of incomingUrl.searchParams.getAll(key)) {
      const id = getPatientReferenceId(value);
      if (id) {
        ids.add(id);
      }
    }
  }

  return Array.from(ids);
}

async function ensurePatientsBelongToOrganization(
  patientIds: string[],
  organizationId: string,
) {
  if (patientIds.length === 0) {
    return null;
  }

  const patients = await prisma.patient.findMany({
    where: {
      id: { in: patientIds },
      organizationId,
    },
    select: { id: true },
  });

  if (patients.length !== patientIds.length) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { userId, organizationId } = await requireOrgContext();
    const canReadPatients = await hasPermission(
      userId,
      organizationId,
      "patients:read",
      "patients",
    );

    if (!canReadPatients) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const baseUrl = getFhirBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { error: "FHIR integration is not configured" },
        { status: 501 },
      );
    }

    const { path } = await params;
    if (!path?.length) {
      return NextResponse.json({ error: "FHIR path is required" }, { status: 400 });
    }

    const validationError = validateFhirPath(path, request.url);
    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status },
      );
    }

    const patientAccessError = await ensurePatientsBelongToOrganization(
      getReferencedPatientIds(path, request.url),
      organizationId,
    );
    if (patientAccessError) {
      return patientAccessError;
    }

    const response = await fetch(buildFhirUrl(path, request.url), {
      headers: {
        Accept: "application/fhir+json, application/json",
        ...(process.env.FHIR_AUTH_TOKEN
          ? { Authorization: `Bearer ${process.env.FHIR_AUTH_TOKEN}` }
          : {}),
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "application/json";
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    if (isAuthContextError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logServerError("FHIR proxy request failed", error);
    return NextResponse.json(
      { error: "Failed to reach FHIR upstream" },
      { status: 502 },
    );
  }
}

/**
 * FHIR R4 write-back: `POST .../Patient` and `POST .../Observation`.
 *
 * Two auth modes:
 *   - Staff session with `patients:write`.
 *   - Machine API key: `Authorization: Bearer crm_live_…` + the owning org's
 *     `x-org-slug` header; the key must hold the `fhir:write` scope.
 *
 * Writes are immutable-to-the-source: Patient create / Vital append, then an
 * `observation.created` / `patient.created` webhook is fired to any subscribed
 * webhook of the org.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const resourceType = path?.[0];
    if (path?.length !== 1 || (resourceType !== "Patient" && resourceType !== "Observation")) {
      return NextResponse.json(
        { error: "Write-back supports only Patient and Observation", status: 501 },
        { status: 501 },
      );
    }

    const resource = (await request.json().catch(() => null)) as FhirResourceInput | null;
    if (!resource || typeof resource !== "object") {
      return NextResponse.json({ error: "Invalid FHIR resource body" }, { status: 400 });
    }

    const bearer = extractBearerToken(request.headers.get("authorization"));
    let organizationId: string;
    let userId: string | null = null;
    let auditOrgId: string;

    if (bearer?.startsWith("crm_live_")) {
      if (!request.headers.get("x-org-slug")) {
        return NextResponse.json(
          { error: "x-org-slug header is required for API key authentication" },
          { status: 400 },
        );
      }
      const org = await prisma.organization.findFirst({
        where: { slug: request.headers.get("x-org-slug") ?? "" },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
      const keyAuth = await authenticateApiKey(org.id, bearer);
      if (!keyAuth.ok) {
        return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
      }
      if (!keyAuth.scopes.includes("fhir:write")) {
        return NextResponse.json({ error: "API key lacks fhir:write scope" }, { status: 403 });
      }
      organizationId = org.id;
      auditOrgId = org.id;
    } else {
      const context = await requireOrgContext();
      const canWrite = await hasPermission(
        context.userId,
        context.organizationId,
        "patients:write",
        "patients",
      );
      if (!canWrite) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      organizationId = context.organizationId;
      userId = context.userId;
      auditOrgId = context.organizationId;
    }

    if (resourceType === "Patient") {
      const parsed = parseFhirPatient(resource);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 422 });
      }
      const patient = await prisma.$transaction(async (tx) => {
        try {
          return await tx.patient.create({
            data: {
              organizationId,
              firstName: parsed.payload.firstName,
              lastName: parsed.payload.lastName,
              gender: parsed.payload.gender,
              dateOfBirth: parsed.payload.dateOfBirth,
              phone: parsed.payload.phone,
              mrn: parsed.payload.mrn,
            },
          });
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            (error as { code?: string }).code === "P2002"
          ) {
            return null; // duplicate MRN
          }
          throw error;
        }
      });
      if (!patient) {
        return NextResponse.json({ error: "MRN already exists for this clinic" }, { status: 409 });
      }
      await createAuditLog({
        organizationId: auditOrgId,
        userId,
        action: "CREATE",
        entityType: "Patient",
        entityId: patient.id,
        actorType: userId ? "user" : "system",
        afterState: JSON.stringify({
          source: "fhir:write",
          mrn: patient.mrn,
        }),
      });
      void deliverWebhook(organizationId, "patient.created", {
        resourceType: "Patient",
        id: patient.id,
        mrn: patient.mrn,
        fullName: `${patient.firstName} ${patient.lastName}`,
      });
      return new NextResponse(
        JSON.stringify(buildFhirResourceResponse("Patient", patient.id)),
        { status: 201, headers: { "Content-Type": "application/fhir+json" } },
      );
    }

    const parsed = parseFhirObservation(resource);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }
    const patient = await prisma.patient.findFirst({
      where: { id: parsed.payload.patientId, organizationId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found in this clinic" }, { status: 404 });
    }
    const vital = await prisma.vital.create({
      data: {
        patientId: patient.id,
        weightKg: parsed.payload.weightKg,
        heightCm: parsed.payload.heightCm,
        bloodPressureSystolic: parsed.payload.bloodPressureSystolic,
        bloodPressureDiastolic: parsed.payload.bloodPressureDiastolic,
        heartRate: parsed.payload.heartRate,
        spO2: parsed.payload.spO2,
        temperature: parsed.payload.temperature,
        recordedAt: parsed.payload.recordedAt ?? new Date(),
      },
    });
    await createAuditLog({
      organizationId: auditOrgId,
      userId,
      action: "CREATE",
      entityType: "Vital",
      entityId: vital.id,
      actorType: userId ? "user" : "system",
      afterState: JSON.stringify({ source: "fhir:write", code: parsed.payload.codeLabel }),
    });
    void deliverWebhook(organizationId, "observation.created", {
      resourceType: "Observation",
      id: vital.id,
      patientId: vital.patientId,
      code: parsed.payload.codeLabel,
    });
    return new NextResponse(
      JSON.stringify(buildFhirResourceResponse("Observation", vital.id)),
      { status: 201, headers: { "Content-Type": "application/fhir+json" } },
    );
  } catch (error) {
    if (isAuthContextError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logServerError("FHIR write-back failed", error);
    return NextResponse.json({ error: "Failed to write FHIR resource" }, { status: 500 });
  }
}
