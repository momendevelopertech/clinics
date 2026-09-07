import { describe, expect, it } from "vitest";
import { labOrderSchema, labResultSchema, labReviewSchema } from "@/lib/validations";

describe("lab and imaging orders", () => {
  it("accepts both lab and imaging orders with priorities", () => {
    expect(labOrderSchema.safeParse({
      patientId: "p1",
      orderType: "imaging",
      testName: "Chest X-ray",
      priority: "urgent",
    }).success).toBe(true);
  });

  it("requires a valid result payload", () => {
    expect(labResultSchema.safeParse({
      patientId: "p1",
      testName: "CBC",
      performedAt: "2026-09-07",
    }).success).toBe(true);
    expect(labResultSchema.safeParse({ patientId: "p1" }).success).toBe(false);
  });

  it("limits reviews to reviewed or abnormal outcomes", () => {
    expect(labReviewSchema.safeParse({ status: "reviewed" }).success).toBe(true);
    expect(labReviewSchema.safeParse({ status: "pending" }).success).toBe(false);
  });
});
