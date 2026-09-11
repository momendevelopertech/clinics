import { describe, expect, it } from "vitest";
import {
  TEMPLATE_REGISTRY,
  getTemplateDef,
  missingTemplateInputs,
  renderTemplatePdf,
  type TemplateData,
} from "@/lib/documents/templates";
import { documentGenerateSchema } from "@/lib/validations/uploads";

const fixture = (): TemplateData => ({
  org: { name: "Test Clinic" },
  patient: { firstName: "Sara", lastName: "Ali", mrn: "MRN-1", phone: "0100", dateOfBirth: "1990-01-01", gender: "Female" },
  doctorName: "Dr. Test",
  encounter: {
    startTime: new Date("2026-09-01"),
    diagnoses: [{ code: "I10", name: "Hypertension" }],
    prescriptions: [{ medicationName: "Concor 5mg", dosage: "5mg", frequency: "daily", duration: "30d", instructions: "morning" }],
    notes: [{ subjective: "s", objective: "o", assessment: "a", plan: "p" }],
    vitals: [{ bloodPressureSystolic: 140, bloodPressureDiastolic: 90, heartRate: 80, temperature: 37 }],
  },
  labOrder: {
    testName: "CBC",
    orderType: "lab",
    priority: "routine",
    indication: "checkup",
    status: "ordered",
    orderedAt: new Date("2026-09-01"),
  },
  fields: {
    referredTo: "Dr. Heart",
    specialty: "Cardiology",
    reason: "Evaluation",
    restDays: "3",
    startDate: "2026-09-12",
    diagnosisText: "Flu",
    testName: "CBC",
  },
  issuedAt: new Date("2026-09-11"),
});

describe("template registry", () => {
  it("has six unique templates with file names", () => {
    const ids = TEMPLATE_REGISTRY.map((t) => t.id);
    expect(new Set(ids).size).toBe(6);
    for (const t of TEMPLATE_REGISTRY) {
      expect(getTemplateDef(t.id)?.docType).toBeTruthy();
      expect(t.fileName(fixture()).endsWith(".pdf")).toBe(true);
    }
    expect(getTemplateDef("nope")).toBeNull();
  });

  it("detects missing inputs", () => {
    const referral = getTemplateDef("referral")!;
    expect(missingTemplateInputs(referral, { fields: {}, labOrder: null })).toEqual(
      expect.arrayContaining(["referredTo", "specialty", "reason"]),
    );
    expect(missingTemplateInputs(referral, { fields: fixture().fields, labOrder: null })).toEqual([]);
    const lab = getTemplateDef("lab_request")!;
    expect(missingTemplateInputs(lab, { fields: {}, labOrder: null })).toEqual(["labOrderId-or-testName"]);
    expect(missingTemplateInputs(lab, { fields: { testName: "CBC" }, labOrder: null })).toEqual([]);
  });
});

describe("documentGenerateSchema", () => {
  it("validates the generate payload", () => {
    expect(
      documentGenerateSchema.safeParse({ template: "referral", patientId: "p1" }).success,
    ).toBe(true);
    expect(
      documentGenerateSchema.safeParse({ template: "xray", patientId: "p1" }).success,
    ).toBe(false);
  });
});

describe("renderTemplatePdf", () => {
  it("renders a real PDF for every template", async () => {
    for (const t of TEMPLATE_REGISTRY) {
      const buf = await renderTemplatePdf(t.id, fixture());
      expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(buf.length).toBeGreaterThan(1000);
    }
  }, 60000);
});
