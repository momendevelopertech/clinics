import QRCode from "qrcode";

export function buildPatientSummaryPayload(input: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
  dateOfBirth?: Date | string | null;
  phone?: string | null;
  email?: string | null;
  diagnoses?: Array<{ name?: string | null; status?: string | null; createdAt?: Date | string | null }>;
  medications?: Array<{ medicationName?: string | null; dosage?: string | null; frequency?: string | null; createdAt?: Date | string | null }>;
  latestVitals?: { bloodPressureSystolic?: number | null; bloodPressureDiastolic?: number | null; heartRate?: number | null; weightKg?: number | null; recordedAt?: Date | string | null } | null;
  lastVisit?: string | null;
}) {
  const patientName = [input.firstName, input.lastName].filter(Boolean).join(" ") || "Patient";
  const qrData = JSON.stringify({
    patientId: input.id,
    mrn: input.mrn || null,
    name: patientName,
    lastVisit: input.lastVisit || null,
  });

  return {
    id: input.id,
    name: patientName,
    mrn: input.mrn || null,
    dob: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString() : null,
    phone: input.phone || null,
    email: input.email || null,
    diagnoses: (input.diagnoses ?? []).map((diagnosis) => ({
      name: diagnosis.name || "Diagnosis",
      status: diagnosis.status || "active",
      date: diagnosis.createdAt ? new Date(diagnosis.createdAt).toISOString() : null,
    })),
    medications: (input.medications ?? []).map((medication) => ({
      name: medication.medicationName || "Medication",
      dosage: medication.dosage || null,
      frequency: medication.frequency || null,
      date: medication.createdAt ? new Date(medication.createdAt).toISOString() : null,
    })),
    latestVitals: input.latestVitals
      ? {
          bloodPressure: input.latestVitals.bloodPressureSystolic && input.latestVitals.bloodPressureDiastolic
            ? `${input.latestVitals.bloodPressureSystolic}/${input.latestVitals.bloodPressureDiastolic}`
            : null,
          heartRate: input.latestVitals.heartRate ?? null,
          weightKg: input.latestVitals.weightKg ?? null,
          recordedAt: input.latestVitals.recordedAt ? new Date(input.latestVitals.recordedAt).toISOString() : null,
        }
      : null,
    lastVisit: input.lastVisit || null,
    qrData,
    qrUrl: "",
  };
}

/**
 * Renders the summary QR locally as a PNG data URL so the patient's name/MRN
 * never leave the server (no third-party QR service involved).
 */
export async function buildPatientSummaryQR(payload: ReturnType<typeof buildPatientSummaryPayload>): Promise<string> {
  try {
    return await QRCode.toDataURL(payload.qrData, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}
