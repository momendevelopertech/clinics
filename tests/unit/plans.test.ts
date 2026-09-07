import { describe, expect, it } from "vitest";
import { getPlanLimits, isPlanName } from "../../src/lib/plans";

describe("plan limits", () => {
  it("recognizes supported plans only", () => {
    expect(isPlanName("free")).toBe(true);
    expect(isPlanName("clinic")).toBe(true);
    expect(isPlanName("plus")).toBe(true);
    expect(isPlanName("enterprise")).toBe(false);
    expect(isPlanName(null)).toBe(false);
  });

  it("falls back to the safe free plan for unknown values", () => {
    expect(getPlanLimits("unknown")).toEqual({
      maxPatients: 50,
      maxStaff: 2,
      maxAppointmentsPerMonth: 200,
    });
  });

  it("keeps plus limits higher than clinic limits", () => {
    const clinic = getPlanLimits("clinic");
    const plus = getPlanLimits("plus");

    expect(plus.maxPatients).toBeGreaterThan(clinic.maxPatients);
    expect(plus.maxStaff).toBeGreaterThan(clinic.maxStaff);
    expect(plus.maxAppointmentsPerMonth).toBeGreaterThan(
      clinic.maxAppointmentsPerMonth,
    );
  });
});
