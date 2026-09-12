/**
 * FHIR R4 → records mappers for the PW write-back surface
 * (`POST /api/integrations/fhir/Patient|Observation`).
 *
 * Pure functions, unit-tested — no Prisma, no I/O.
 */

export type FhirResourceInput = Record<string, unknown>;

// ---------- Patient ----------

export type PatientWritePayload = {
  firstName: string;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: Date | null;
  phone?: string | null;
  mrn?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function parseFhirPatient(
  resource: FhirResourceInput,
): { ok: true; payload: PatientWritePayload } | { ok: false; error: string } {
  if (resource.resourceType !== "Patient") {
    return { ok: false, error: "resourceType must be Patient" };
  }

  const nameEntry = (asArray(resource.name) ?? []).find((entry) =>
    typeof entry === "object" && entry !== null && (entry as { use?: string }).use !== "official" && ((entry as { family?: string }).family || (entry as { given?: string[] }).given)
  ) ?? (asArray(resource.name) ?? [])[0];

  const name = asRecord(nameEntry) ?? {};
  const given = (asArray(name.given) ?? []).filter((g): g is string => typeof g === "string");
  const firstName = given.join(" ").trim();
  const lastName = typeof name.family === "string" ? name.family.trim() : "";

  if (!firstName && !lastName) {
    return { ok: false, error: "Patient resource must contain a name" };
  }

  let gender: string | null = null;
  if (typeof resource.gender === "string" && resource.gender) {
    const normalized = resource.gender.toLowerCase();
    gender = ["male", "female", "unknown"].includes(normalized)
      ? normalized
      : "unknown";
  }

  let dateOfBirth: Date | null = null;
  if (typeof resource.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(resource.birthDate)) {
    const parsed = new Date(`${resource.birthDate}T00:00:00Z`);
    dateOfBirth = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  let phone: string | null = null;
  for (const entry of asArray(resource.telecom) ?? []) {
    const telecom = asRecord(entry);
    if (telecom?.system === "phone" && typeof telecom.value === "string" && telecom.value) {
      phone = telecom.value;
      break;
    }
  }

  let mrn: string | null = null;
  for (const entry of asArray(resource.identifier) ?? []) {
    const identifier = asRecord(entry);
    const typeText = asRecord(identifier?.type)?.text;
    const system = typeof identifier?.system === "string" ? identifier.system : "";
    if (mrn) continue;
    if (typeof identifier?.value === "string" && identifier.value && (system.toLowerCase().includes("mrn") || typeText === "MRN")) {
      mrn = identifier.value;
    }
  }

  return {
    ok: true,
    payload: {
      firstName: firstName || (lastName ? "Unknown" : ""),
      lastName: lastName || (firstName ? "Unknown" : ""),
      gender,
      dateOfBirth,
      phone,
      mrn,
    },
  };
}

// ---------- Observation ----------

export type ObservationWritePayload = {
  patientId: string;
  weightKg?: number | null;
  heightCm?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  spO2?: number | null;
  temperature?: number | null;
  recordedAt?: Date | null;
  codeLabel?: string | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function subjectPatientId(resource: FhirResourceInput): string | null {
  const subject = asRecord(resource.subject);
  const reference = typeof subject?.reference === "string" ? subject.reference : null;
  return reference?.startsWith("Patient/") ? reference.slice("Patient/".length) : null;
}

export function parseFhirObservation(
  resource: FhirResourceInput,
): {
  ok: true;
  kind: string;
  payload: ObservationWritePayload;
} | {
  ok: false;
  error: string;
} {
  if (resource.resourceType !== "Observation") {
    return { ok: false, error: "resourceType must be Observation" };
  }
  const patientId = subjectPatientId(resource);
  if (!patientId) {
    return { ok: false, error: "Observation.subject.reference must be Patient/{id}" };
  }

  const codeBlock = asRecord(resource.code) ?? {};
  const coding = asRecord(asArray(codeBlock.coding ?? [])?.[0]);
  const code = typeof coding?.code === "string" ? coding.code.toLowerCase() : "";
  const display = typeof coding?.display === "string" ? coding.display : "";
  const codeText = typeof codeBlock.text === "string" ? codeBlock.text.toLowerCase() : "";
  const haystack = `${code} ${display.toLowerCase()} ${codeText}`.toLowerCase();

  let weightKg: number | null = null;
  let heightCm: number | null = null;
  let bloodPressureSystolic: number | null = null;
  let bloodPressureDiastolic: number | null = null;
  let heartRate: number | null = null;
  let spO2: number | null = null;
  let temperature: number | null = null;

  const rawValue = toNumber((asRecord(resource.valueQuantity) ?? {}).value);

  if (/(weight|body-weight)/.test(haystack)) {
    weightKg = rawValue;
  } else if (/height/.test(haystack)) {
    heightCm = rawValue;
  } else if (/(heart-rate|heart rate|pulse|bpm|8867-4)/.test(haystack)) {
    heartRate = rawValue;
  } else if (/(body-temperature|temperature|8310-5)/.test(haystack) || /temp/.test(haystack)) {
    temperature = rawValue;
  } else if (/(oxygen-saturation|spo2|saO2|2708-6)/.test(haystack)) {
    spO2 = rawValue;
  }

  if (/(blood[\s-]?pressure|\bbp\b|vital[\s-]?signs)/.test(haystack)) {
    for (const component of asArray(resource.component) ?? []) {
      const cmpRecord = asRecord(component as Record<string, unknown>) ?? {};
      const cmpCoding = asRecord(asArray(asRecord(cmpRecord.code)?.coding ?? [])?.[0]) ?? {};
      const cmpCodeRaw = typeof cmpCoding.code === "string" ? cmpCoding.code.toLowerCase() : "";
      const cmpDisplay = typeof cmpCoding.display === "string" ? cmpCoding.display.toLowerCase() : "";
      const cmpHaystack = `${cmpCodeRaw} ${cmpDisplay}`;
      const val = toNumber(
        asRecord(cmpRecord.valueQuantity)?.value ?? null,
      );
      if (/(systolic|systole)/.test(cmpHaystack)) bloodPressureSystolic = val;
      if (/(diastolic|diastole)/.test(cmpHaystack)) bloodPressureDiastolic = val;
    }
  }

  if (
    weightKg === null &&
    heightCm === null &&
    bloodPressureSystolic === null &&
    bloodPressureDiastolic === null &&
    heartRate === null &&
    spO2 === null &&
    temperature === null
  ) {
    return { ok: false, error: "Observation code is not a supported vital sign" };
  }

  let recordedAt: Date | null = null;
  if (typeof resource.effectiveDateTime === "string") {
    const parsed = new Date(resource.effectiveDateTime);
    recordedAt = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return {
    ok: true,
    kind: "vital",
    payload: {
      patientId,
      weightKg,
      heightCm,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      heartRate,
      spO2,
      temperature,
      recordedAt,
      codeLabel: display || code || null,
    },
  };
}

export function buildFhirResourceResponse(
  resourceType: "Patient" | "Observation",
  id: string,
): Record<string, unknown> {
  return {
    resourceType,
    id,
    meta: { versionId: "1", lastUpdated: new Date().toISOString() },
  };
}