import { describe, expect, it } from "vitest";
import { branchCreateSchema, roomCreateSchema } from "../../src/lib/validations/location";

describe("branch and room foundations", () => {
  it("validates branch fields and statuses", () => {
    expect(branchCreateSchema.safeParse({ name: "Main Clinic", status: "active" }).success).toBe(true);
    expect(branchCreateSchema.safeParse({ name: "", status: "active" }).success).toBe(false);
    expect(branchCreateSchema.safeParse({ name: "Main", status: "closed" }).success).toBe(false);
  });

  it("requires room names and accepts optional branch assignment", () => {
    expect(roomCreateSchema.safeParse({ name: "Room 1", branchId: "branch-1" }).success).toBe(true);
    expect(roomCreateSchema.safeParse({ name: "", branchId: null }).success).toBe(false);
  });
});
