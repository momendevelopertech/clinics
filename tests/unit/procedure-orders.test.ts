import { describe, expect, it } from "vitest";
import { procedureOrderSchema, procedureUpdateSchema } from "@/lib/validations";

describe("procedure orders", () => {
  it("validates catalog-backed procedure orders", () => {
    expect(procedureOrderSchema.safeParse({
      patientId: "p1",
      serviceCatalogId: "service-1",
      procedureName: "Minor surgery",
      scheduledAt: "2026-09-08T10:00:00.000Z",
    }).success).toBe(true);
  });

  it("allows only lifecycle statuses", () => {
    expect(procedureUpdateSchema.safeParse({ status: "completed" }).success).toBe(true);
    expect(procedureUpdateSchema.safeParse({ status: "pending" }).success).toBe(false);
  });
});
