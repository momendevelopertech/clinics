import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";

const REQUIRED_NAV_KEYS = [
  "nav_dashboard",
  "nav_patients",
  "nav_appointments",
  "nav_queue",
  "nav_encounters",
  "nav_analytics",
  "nav_consents",
  "nav_audit",
  "nav_billing",
  "nav_payments",
  "nav_labs",
  "nav_inventory",
  "nav_tasks",
  "nav_documents",
  "nav_communications",
  "nav_campaigns",
  "nav_automation",
  "nav_plan",
  "nav_reports",
  "nav_availability",
  "nav_locations",
  "nav_catalogs",
  "nav_settings",
  "nav_waitlist",
  "nav_security",
] as const;

describe("navigation + i18n consistency", () => {
  it("has every nav key in both dictionaries", () => {
    for (const key of REQUIRED_NAV_KEYS) {
      expect(en[key], `missing en:${key}`).toBeTruthy();
      expect(ar[key], `missing ar:${key}`).toBeTruthy();
    }
  });

  it("has campaign status keys mirrored", () => {
    for (const key of [
      "camp_status_draft",
      "camp_status_active",
      "camp_status_paused",
      "camp_status_archived",
    ] as const) {
      expect(en[key]).toBeTruthy();
      expect(ar[key]).toBeTruthy();
    }
  });

  it("landing_clinicsSubtitle uses {appName} placeholder in both locales", () => {
    expect(en.landing_clinicsSubtitle).toContain("{appName}");
    expect(ar.landing_clinicsSubtitle).toContain("{appName}");
  });

  it("keeps full dictionary parity (no missing keys)", () => {
    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();
    expect(arKeys).toEqual(enKeys);
  });
});
