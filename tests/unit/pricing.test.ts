import { describe, expect, it } from "vitest";
import {
  buildPlanHighlights,
  FALLBACK_PLANS,
  formatLimit,
  formatPrice,
  parseFeatures,
  type PricingPlan,
} from "../../src/lib/landing/pricing";
import { en } from "../../src/lib/i18n/dictionaries/en";
import { ar } from "../../src/lib/i18n/dictionaries/ar";

const planOf = (code: string): PricingPlan => {
  const plan = FALLBACK_PLANS.find((p) => p.code === code);
  if (!plan) throw new Error(`unknown fallback plan ${code}`);
  return plan;
};

describe("landing pricing format helpers", () => {
  it("formats price including $0 for free", () => {
    expect(formatPrice(0)).toBe("$0");
    expect(formatPrice(99)).toBe("$99");
    expect(formatPrice(249)).toBe("$249");
    expect(formatPrice(1200)).toBe("$1,200");
  });

  it("formats limit values, null becomes unlimited", () => {
    expect(formatLimit(50)).toBe("50");
    expect(formatLimit(1)).toBe("1");
    expect(formatLimit(null)).toBeNull();
    expect(formatLimit(999_999_999)).toBeNull();
  });

  it("ignores malformed featuresJson", () => {
    expect(parseFeatures(null)).toEqual({});
    expect(parseFeatures("")).toEqual({});
    expect(parseFeatures("{not json")).toEqual({});
    expect(parseFeatures('{"patients":{"enabled":true,"limit":5}}')).toEqual({
      patients: { enabled: true, limit: 5 },
    });
  });
});

describe("buildPlanHighlights", () => {
  it("renders free plan caps with templates", () => {
    const highlights = buildPlanHighlights(planOf("free"), en);
    const labels = highlights.map((h) => h.label);
    expect(labels).toContain("Up to 50 Patients");
    expect(labels).toContain("Up to 2 Staff members");
    expect(labels).toContain("Up to 1 Doctors");
    expect(labels).toContain("Up to 200 Appointments / month");
    expect(labels).toContain("Up to 1 Storage (GB)");
    expect(highlights.every((h) => !h.unlimited)).toBe(true);
  });

  it("renders clinic with higher caps and enabled premium features", () => {
    const highlights = buildPlanHighlights(planOf("clinic"), en);
    const labels = highlights.map((h) => h.label);
    expect(labels).toContain("Up to 500 Patients");
    expect(labels).toContain("Patient portal");
    expect(labels).toContain("Online booking");
    expect(labels).toContain("SMS reminders");
    expect(labels).toContain("Financial reports");
    expect(labels).not.toContain("Advanced reports");
    expect(labels).not.toContain("Campaigns");
  });

  it("renders plus with unlimited caps and full premium set", () => {
    const highlights = buildPlanHighlights(planOf("plus"), en);
    const labels = highlights.map((h) => h.label);
    expect(labels).toContain("Unlimited Patients");
    expect(labels).toContain("Unlimited Staff members");
    expect(labels).toContain("Unlimited Appointments / month");
    const unlimited = highlights.filter((h) => h.unlimited);
    expect(unlimited.length).toBe(4);
    expect(labels).toContain("Campaigns");
    expect(labels).toContain("Automation");
    expect(labels).toContain("Advanced reports");
    expect(labels).toContain("Multi-branch management");
    expect(labels).toContain("Priority support");
  });

  it("shows no per-plan premium inflation on free (only caps)", () => {
    const highlights = buildPlanHighlights(planOf("free"), en);
    const labels = highlights.map((h) => h.label);
    expect(labels).not.toContain("CRM & patient list");
    expect(labels).not.toContain("Patient portal");
  });

  it("works for both locales with matching label keys", () => {
    const enFree = buildPlanHighlights(planOf("free"), en).map((h) => h.label);
    const arFree = buildPlanHighlights(planOf("free"), ar).map((h) => h.label);
    expect(arFree).toHaveLength(enFree.length);
    for (const label of arFree) expect(label.length).toBeGreaterThan(0);
  });
});