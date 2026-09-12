import { describe, expect, it } from "vitest";
import {
  findMedicationAllergyWarnings,
  type AllergyLike,
} from "@/lib/allergies";
import {
  patientAllergyCreateSchema,
  patientAllergyUpdateSchema,
} from "@/lib/validations";

describe("medication allergy screening", () => {
  const allergies: AllergyLike[] = [
    { allergen: "Penicillin", severity: "severe", reaction: "anaphylaxis", active: true },
    { allergen: "Aspirin", severity: "mild", reaction: "heartburn", active: false },
    { allergen: "Sulfa", severity: "moderate", reaction: "rash", active: true },
  ];

  it("flags an exact allergen match", () => {
    const hits = findMedicationAllergyWarnings(allergies, "penicillin");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ allergen: "Penicillin", severity: "severe" });
  });

  it("flags embedded/contained matches", () => {
    expect(findMedicationAllergyWarnings(allergies, "Penicillin V Potassium")).toHaveLength(1);
    expect(findMedicationAllergyWarnings(allergies, "Sulfamethoxazole")).toHaveLength(1);
  });

  it("ignores inactive allergies and blank names", () => {
    expect(findMedicationAllergyWarnings(allergies, "Aspirin")).toHaveLength(0);
    expect(findMedicationAllergyWarnings(allergies, "")).toHaveLength(0);
  });

  it("returns no warnings when nothing clashes", () => {
    expect(findMedicationAllergyWarnings(allergies, "Paracetamol")).toHaveLength(0);
  });
});

describe("allergy schemas", () => {
  it("accepts a sealed allergy and rejects unknown severities", () => {
    expect(
      patientAllergyCreateSchema.safeParse({ allergen: "Penicillin", severity: "severe" }).success,
    ).toBe(true);
    expect(
      patientAllergyCreateSchema.safeParse({ allergen: "X", severity: "fatal" }).success,
    ).toBe(false);
    expect(patientAllergyUpdateSchema.safeParse({ active: false }).success).toBe(true);
  });
});