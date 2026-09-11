import { describe, expect, it } from "vitest";
import {
  canTransitionClaim,
  checkEligibility,
  claimCreditAmount,
} from "@/lib/insurance";

describe("canTransitionClaim", () => {
  it("follows the submitted → pending → paid/denied → appeal flow", () => {
    expect(canTransitionClaim("submitted", "pending")).toBe(true);
    expect(canTransitionClaim("submitted", "paid")).toBe(false);
    expect(canTransitionClaim("pending", "paid")).toBe(true);
    expect(canTransitionClaim("denied", "appeal")).toBe(true);
    expect(canTransitionClaim("appeal", "pending")).toBe(true);
    expect(canTransitionClaim("paid", "appeal")).toBe(false);
    expect(canTransitionClaim("unknown", "pending")).toBe(false);
  });
});

describe("checkEligibility", () => {
  it("approves active patients with a policy at an active org", () => {
    expect(
      checkEligibility({ patientStatus: "Active", organizationStatus: "active", hasPolicy: true }),
    ).toEqual({ eligible: true, reasons: [] });
  });

  it("lists every blocking reason", () => {
    const result = checkEligibility({
      patientStatus: "Archived",
      organizationStatus: "suspended",
      hasPolicy: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["organization-not-active", "no-policy-on-file", "patient-archived"]),
    );
  });
});

describe("claimCreditAmount", () => {
  it("caps payouts at the outstanding balance and floors at zero", () => {
    expect(claimCreditAmount(100, 60)).toBe(60);
    expect(claimCreditAmount(100, 150)).toBe(100);
    expect(claimCreditAmount(0, 50)).toBe(0);
    expect(claimCreditAmount(100, -5)).toBe(0);
  });
});
