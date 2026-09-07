import { describe, expect, it } from "vitest";
import { diagnosisSchema, followUpSchema, prescriptionItemSchema } from "@/lib/validations";

describe("clinical orders", () => {
  it("validates diagnoses and follow-ups", () => {
    expect(diagnosisSchema.safeParse({ patientId: "p1", system: "ICD-10", code: "I10", name: "Hypertension" }).success).toBe(true);
    expect(followUpSchema.safeParse({ patientId: "p1", dueDate: "2026-10-01", reason: "Review symptoms" }).success).toBe(true);
  });
  it("validates itemized prescription items", () => {
    expect(prescriptionItemSchema.safeParse({ medicationName: "Amoxicillin", dosage: "500 mg" }).success).toBe(true);
    expect(prescriptionItemSchema.safeParse({ medicationName: "" }).success).toBe(false);
  });
});
