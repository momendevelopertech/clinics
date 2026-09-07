import { describe, expect, it } from "vitest";
import { clinicalCatalogSchema, serviceCatalogSchema } from "@/lib/validations/catalog";

describe("catalog validation", () => {
  it("accepts priced services", () => {
    expect(serviceCatalogSchema.parse({ code: "CONSULT", name: "Consultation", price: 50 })).toMatchObject({ code: "CONSULT" });
  });
  it("rejects negative prices", () => {
    expect(serviceCatalogSchema.safeParse({ code: "X", name: "X", price: -1 }).success).toBe(false);
  });
  it("requires a clinical coding system", () => {
    expect(clinicalCatalogSchema.safeParse({ code: "I10", name: "Hypertension", category: "diagnosis" }).success).toBe(false);
  });
});
