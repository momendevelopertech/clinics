import { describe, expect, it } from "vitest";
import { encounterCreateSchema, encounterUpdateSchema } from "@/lib/validations";

describe("encounter lifecycle validation", () => {
  it("validates encounter creation and completion", () => {
    expect(encounterCreateSchema.safeParse({ patientId: "patient-1", encounterType: "office_visit" }).success).toBe(true);
    expect(encounterUpdateSchema.safeParse({ status: "completed" }).success).toBe(true);
  });

  it("rejects unsupported encounter statuses", () => {
    expect(encounterUpdateSchema.safeParse({ status: "cancelled" }).success).toBe(false);
  });
});
