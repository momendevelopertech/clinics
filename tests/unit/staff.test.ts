import { describe, expect, it } from "vitest";
import { staffProfileUpdateSchema } from "../../src/lib/validations/staff";

describe("staff operational profiles", () => {
  it("accepts doctor profile and assignment fields", () => {
    expect(staffProfileUpdateSchema.safeParse({
      specialty: "Cardiology",
      licenseNumber: "LIC-100",
      branchId: "branch-1",
      roomId: "room-1",
      availableFrom: "09:00",
      availableTo: "17:00",
    }).success).toBe(true);
  });

  it("rejects invalid assignment data and time windows", () => {
    expect(staffProfileUpdateSchema.safeParse({ branchId: "", availableFrom: "9am" }).success).toBe(false);
  });
});
