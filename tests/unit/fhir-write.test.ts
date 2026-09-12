import { describe, expect, it } from "vitest";
import { parseFhirPatient, parseFhirObservation } from "@/lib/fhir-write";

describe("parseFhirPatient", () => {
  it("maps a minimal Patient resource with a name", () => {
    const result = parseFhirPatient({
      resourceType: "Patient",
      name: [{ family: "Smith", given: ["Anna"] }],
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        firstName: "Anna",
        lastName: "Smith",
        gender: null,
        dateOfBirth: null,
        phone: null,
        mrn: null,
      },
    });
  });

  it("maps gender, birthDate, phone and MRN identifier", () => {
    const result = parseFhirPatient({
      resourceType: "Patient",
      name: [{ family: "Jones", given: ["Bob"], use: "official" }],
      gender: "male",
      birthDate: "1990-04-12",
      telecom: [{ system: "phone", value: "+201234567890" }],
      identifier: [{ system: "http://hospital/mrn", value: "MRN123" }],
    });
    expect(result).toMatchObject({
      ok: true,
      payload: {
        firstName: "Bob",
        lastName: "Jones",
        gender: "male",
        phone: "+201234567890",
        mrn: "MRN123",
      },
    });
    const dateOfBirth = result.ok ? result.payload.dateOfBirth : null;
    expect(dateOfBirth?.toISOString()).toBe("1990-04-12T00:00:00.000Z");
  });

  it("rejects resources that are not Patient and missing names", () => {
    expect(parseFhirPatient({ resourceType: "Observation", name: [] })).toEqual({
      ok: false,
      error: "resourceType must be Patient",
    });
    expect(
      parseFhirPatient({ resourceType: "Patient", name: [{ given: [] }] }),
    ).toEqual({ ok: false, error: "Patient resource must contain a name" });
  });
});

describe("parseFhirObservation", () => {
  it("parses a blood pressure with component values", () => {
    const result = parseFhirObservation({
      resourceType: "Observation",
      code: { text: "Blood pressure" },
      subject: { reference: "Patient/MRN123" },
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
      component: [
        { code: { coding: [{ code: "8480-6", display: "Systolic blood pressure" }] }, valueQuantity: { value: 120, unit: "mmHg" } },
        { code: { coding: [{ code: "8462-4", display: "Diastolic blood pressure" }] }, valueQuantity: { value: 80, unit: "mmHg" } },
      ],
      effectiveDateTime: "2026-09-12T09:00:00Z",
    });
    expect(result).toMatchObject({
      ok: true,
      kind: "vital",
      payload: {
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
      },
    });
  });

  it("parses weight and heart rate quantity values", () => {
    const result = parseFhirObservation({
      resourceType: "Observation",
      code: { text: "Weight" },
      subject: { reference: "Patient/MRN123" },
      valueQuantity: { value: 72.5, unit: "kg" },
    });
    expect(result).toMatchObject({ ok: true, payload: { weightKg: 72.5 } });

    const hr = parseFhirObservation({
      resourceType: "Observation",
      code: { coding: [{ code: "8867-4" }] },
      subject: { reference: "Patient/MRN123" },
      valueQuantity: { value: 84, unit: "/min" },
    });
    expect(hr).toMatchObject({ ok: true, payload: { heartRate: 84 } });
  });

  it("rejects observations without a subject reference", () => {
    const result = parseFhirObservation({
      resourceType: "Observation",
      code: { text: "Weight" },
    });
    expect(result.ok).toBe(false);
  });
});