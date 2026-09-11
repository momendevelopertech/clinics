import { describe, expect, it } from "vitest";
import { missingRequiredAnswers, slugifyFieldKey } from "@/lib/intake";
import { intakeFieldCreateSchema, intakeFormCreateSchema, intakeResponseSchema } from "@/lib/validations";

describe("missingRequiredAnswers", () => {
  const fields = [
    { key: "allergies", required: true },
    { key: "smoker", required: false },
  ];
  it("flags blank required answers only", () => {
    expect(missingRequiredAnswers(fields, { allergies: "penicillin" })).toEqual([]);
    expect(missingRequiredAnswers(fields, { allergies: "  " })).toEqual(["allergies"]);
    expect(missingRequiredAnswers(fields, {})).toEqual(["allergies"]);
    expect(missingRequiredAnswers(fields, { allergies: 0 })).toEqual([]);
  });
});

describe("slugifyFieldKey", () => {
  it("slugs labels incl. Arabic", () => {
    expect(slugifyFieldKey("Blood Pressure", "f0")).toBe("blood-pressure");
    expect(slugifyFieldKey("ضغط الدم", "f0")).toBe("ضغط-الدم");
    expect(slugifyFieldKey("!!!", "f0")).toBe("f0");
  });
});

describe("intake schemas", () => {
  it("validates forms, fields, responses", () => {
    expect(intakeFormCreateSchema.safeParse({ name: "New visit" }).success).toBe(true);
    expect(
      intakeFieldCreateSchema.safeParse({ label: "Allergies", kind: "multiline", required: true })
        .success,
    ).toBe(true);
    expect(
      intakeFieldCreateSchema.safeParse({ label: "x", kind: "mri" }).success,
    ).toBe(false);
    expect(
      intakeResponseSchema.safeParse({ formId: "f", answers: { a: "b", n: 3, ok: true } }).success,
    ).toBe(true);
  });
});
