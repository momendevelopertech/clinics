import { describe, expect, it } from "vitest";
import { buildPatientSummaryPayload, buildPatientSummaryQR } from "@/lib/patient-summary";

describe("patient summary", () => {
  it("builds a printable summary payload with QR data", () => {
    const payload = buildPatientSummaryPayload({
      id: "p1",
      firstName: "Sara",
      lastName: "Ali",
      mrn: "MRN-100",
      dateOfBirth: "1990-01-10T00:00:00Z",
      phone: "+966500000000",
      email: "sara@example.com",
      diagnoses: [{ name: "Hypertension", status: "active" }],
      medications: [{ medicationName: "Amlodipine", dosage: "5mg", frequency: "Daily" }],
      latestVitals: { bloodPressureSystolic: 120, bloodPressureDiastolic: 80, heartRate: 72, weightKg: 60 },
      lastVisit: "2026-09-10T00:00:00Z",
    });

    expect(payload.name).toBe("Sara Ali");
    expect(payload.qrUrl).toBe("");
    expect(payload.qrData).toContain('"mrn":"MRN-100"');
    expect(payload.diagnoses[0].name).toBe("Hypertension");
    expect(payload.medications[0].name).toBe("Amlodipine");
  });

  it("renders the QR locally as a data URL (no third-party service)", async () => {
    const payload = buildPatientSummaryPayload({
      id: "p1",
      firstName: "Sara",
      lastName: "Ali",
      mrn: "MRN-100",
    });
    const qrUrl = await buildPatientSummaryQR(payload);
    expect(qrUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(qrUrl).not.toContain("api.qrserver.com");
  });
});
