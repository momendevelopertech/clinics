import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";
import { canTransitionClaim } from "@/lib/insurance";
import { getEquipmentCalibrationAlertStatus } from "@/lib/equipment-maintenance";

/**
 * Phase-2 pages (insurance / equipment / integrations) rely on:
 *  - i18n keys existing in BOTH dictionaries (parity is also enforced globally),
 *  - the backend contracts they consume (claim transitions, calibration alerts).
 * These tests pin the exact contracts the new pages render from.
 */
describe("new dashboard pages (insurance / equipment / integrations)", () => {
  it("has every new nav + page key in en and ar", () => {
    const keys = [
      "nav_insurance",
      "nav_equipment",
      "nav_integrations",
      "ins_subtitle",
      "ins_tab_policies",
      "ins_tab_claims",
      "ins_colProvider",
      "ins_colPolicyNumber",
      "ins_colEligibility",
      "ins_colClaimed",
      "ins_colAdvance",
      "ins_checkEligibility",
      "ins_eligible",
      "ins_ineligible",
      "ins_emptyPolicies",
      "ins_emptyClaims",
      "ins_newPolicy",
      "ins_newClaim",
      "ins_claim_submitted",
      "ins_claim_pending",
      "ins_claim_paid",
      "ins_claim_denied",
      "ins_claim_appeal",
      "eq_subtitle",
      "eq_items",
      "eq_search",
      "eq_empty",
      "eq_colCalibration",
      "eq_calOk",
      "eq_calWarning",
      "eq_calOverdue",
      "eq_viewLog",
      "eq_maintenance",
      "eq_emptyLog",
      "eq_status_active",
      "eq_status_inactive",
      "eq_status_maintenance_required",
      "int_subtitle",
      "int_apiKeys",
      "int_apiKeysDesc",
      "int_keyOnce",
      "int_emptyKeys",
      "int_revoke",
      "int_webhooks",
      "int_webhooksDesc",
      "int_emptyHooks",
      "cfg_badge",
      "cfg_feature_ai",
      "cfg_feature_fhir",
      "cfg_feature_twilio",
      "cfg_feature_cloudinary",
      "cfg_feature_stripe",
      "cfg_feature_email",
      "cfg_stepEnv",
      "cfg_stepRestart",
      "cfg_docsLink",
    ];
    for (const key of keys) {
      expect(en[key], `missing en:${key}`).toBeTruthy();
      expect(ar[key], `missing ar:${key}`).toBeTruthy();
    }
  });

  it("insurance page only offers backend-legal claim transitions", () => {
    // Mirrors the advance-status dropdown: submitted -> pending/denied, etc.
    expect(canTransitionClaim("submitted", "pending")).toBe(true);
    expect(canTransitionClaim("submitted", "paid")).toBe(false);
    expect(canTransitionClaim("pending", "paid")).toBe(true);
    expect(canTransitionClaim("paid", "appeal")).toBe(false);
    expect(canTransitionClaim("denied", "appeal")).toBe(true);
  });

  it("equipment page badges match the calibration alert helper", () => {
    const now = new Date("2026-09-12T00:00:00Z");
    expect(
      getEquipmentCalibrationAlertStatus(
        { nextCalibrationAt: new Date("2026-09-01T00:00:00Z"), status: "active" },
        now,
      ),
    ).toBe("overdue");
    expect(
      getEquipmentCalibrationAlertStatus(
        { nextCalibrationAt: new Date("2026-09-20T00:00:00Z"), status: "active" },
        now,
      ),
    ).toBe("warning");
    expect(
      getEquipmentCalibrationAlertStatus(
        { nextCalibrationAt: new Date("2027-01-01T00:00:00Z"), status: "active" },
        now,
      ),
    ).toBe("ok");
  });
});
