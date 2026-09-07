import { describe, expect, it } from "vitest";
import { patientCreateSchema, patientHistorySchema } from "@/lib/validations";

describe("patient foundation validation", () => {
  it("accepts a tenant MRN and structured history entry", () => {
    expect(patientCreateSchema.parse({ firstName: "Mona", lastName: "Ali", mrn: "MRN-1001" }).mrn).toBe("MRN-1001");
    expect(patientHistorySchema.parse({ category: "diagnosis", title: "Hypertension" })).toMatchObject({ status: "active" });
  });

  it("rejects invalid MRNs and empty history titles", () => {
    expect(patientCreateSchema.safeParse({ firstName: "Mona", lastName: "Ali", mrn: "1001" }).success).toBe(false);
    expect(patientHistorySchema.safeParse({ category: "diagnosis", title: "" }).success).toBe(false);
  });
});
