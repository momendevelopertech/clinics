import { describe, expect, it } from "vitest";
import { isSoapEmpty, prefillSoap } from "@/lib/clinical-templates";
import { clinicalTemplateCreateSchema } from "@/lib/validations/encounter";

const EMPTY = { subjective: "", objective: "", assessment: "", plan: "" };

describe("prefillSoap", () => {
  it("fills only blank fields, doctor content wins", () => {
    const out = prefillSoap(
      { ...EMPTY, assessment: "HTN" },
      { subjective: "dizzy", assessment: "template-dx", plan: "labs" },
    );
    expect(out).toEqual({ subjective: "dizzy", objective: "", assessment: "HTN", plan: "labs" });
  });

  it("trims template whitespace and ignores blanks", () => {
    const out = prefillSoap(EMPTY, { subjective: "  spaced  ", objective: " " });
    expect(out.subjective).toBe("spaced");
    expect(out.objective).toBe("");
  });

  it("detects empty drafts", () => {
    expect(isSoapEmpty(EMPTY)).toBe(true);
    expect(isSoapEmpty({ ...EMPTY, plan: "x" })).toBe(false);
  });
});

describe("clinicalTemplateCreateSchema", () => {
  it("accepts a named template with partial SOAP", () => {
    expect(
      clinicalTemplateCreateSchema.safeParse({ name: "HTN follow-up", assessment: "HTN" }).success,
    ).toBe(true);
  });

  it("rejects blank names", () => {
    expect(clinicalTemplateCreateSchema.safeParse({ name: " " }).success).toBe(false);
  });
});
