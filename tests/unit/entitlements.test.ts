import { describe, expect, it } from "vitest";
import { parsePlanFeatures, parsePlanModules } from "../../src/lib/entitlements/resolve";
import { computeLimitUsage } from "../../src/lib/entitlements/access";
import { asLimit, isUnlimitedValue } from "../../src/lib/entitlements/types";
import type { OverrideDto, ResolvedEntitlements } from "../../src/lib/entitlements/types";
import {
  FEATURE_DEFS,
  FEATURE_ORDER,
  LIMIT_KEYS,
  MODULE_DEFS,
  MODULE_ORDER_KEYS,
  PREMIUM_MODULES,
} from "../../src/lib/entitlements/catalog";
import { en } from "../../src/lib/i18n/dictionaries/en";
import { ar } from "../../src/lib/i18n/dictionaries/ar";

// Exact seed JSON copied from the plan_subscription_entitlements migration.
const FREE_MODULES = `{"dashboard":{"enabled":true},"patients":{"enabled":true},"appointments":{"enabled":true},"queue":{"enabled":true},"encounters":{"enabled":true},"analytics":{"enabled":true},"consents":{"enabled":true},"audit":{"enabled":true},"labs":{"enabled":true},"tasks":{"enabled":true},"documents":{"enabled":true},"reports":{"enabled":true},"availability":{"enabled":true},"catalogs":{"enabled":true},"communications":{"enabled":false},"locations":{"enabled":true},"waitlist":{"enabled":true},"billing":{"enabled":false},"payments":{"enabled":false},"inventory":{"enabled":true},"automation":{"enabled":false},"campaigns":{"enabled":false},"settings":{"enabled":true},"plan":{"enabled":true},"help":{"enabled":true}}`;
const FREE_FEATURES = `{"patients":{"enabled":true,"limit":50},"staff":{"enabled":true,"limit":2},"doctors":{"enabled":true,"limit":1},"appointments_month":{"enabled":true,"limit":200},"storage_gb":{"enabled":true,"limit":1},"crm":{"enabled":false},"campaigns":{"enabled":false},"automation":{"enabled":false},"advanced_reports":{"enabled":false},"financial_reports":{"enabled":false},"basic_reports":{"enabled":true},"patient_portal":{"enabled":false},"online_booking":{"enabled":false},"sms_reminders":{"enabled":false},"email_reminders":{"enabled":false},"multi_branch":{"enabled":false},"priority_support":{"enabled":false},"audit_trail":{"enabled":true}}`;

const CLINIC_MODULES = `{"dashboard":{"enabled":true},"patients":{"enabled":true},"appointments":{"enabled":true},"queue":{"enabled":true},"encounters":{"enabled":true},"analytics":{"enabled":true},"consents":{"enabled":true},"audit":{"enabled":true},"labs":{"enabled":true},"tasks":{"enabled":true},"documents":{"enabled":true},"reports":{"enabled":true},"availability":{"enabled":true},"catalogs":{"enabled":true},"communications":{"enabled":true},"locations":{"enabled":true},"waitlist":{"enabled":true},"billing":{"enabled":true},"payments":{"enabled":true},"inventory":{"enabled":true},"automation":{"enabled":false},"campaigns":{"enabled":false},"settings":{"enabled":true},"plan":{"enabled":true},"help":{"enabled":true}}`;
const CLINIC_FEATURES = `{"patients":{"enabled":true,"limit":500},"staff":{"enabled":true,"limit":10},"doctors":{"enabled":true,"limit":5},"appointments_month":{"enabled":true,"limit":5000},"storage_gb":{"enabled":true,"limit":10},"crm":{"enabled":true},"campaigns":{"enabled":false},"automation":{"enabled":false},"advanced_reports":{"enabled":false},"financial_reports":{"enabled":true},"basic_reports":{"enabled":true},"patient_portal":{"enabled":true},"online_booking":{"enabled":true},"sms_reminders":{"enabled":true},"email_reminders":{"enabled":true},"multi_branch":{"enabled":false},"priority_support":{"enabled":false},"audit_trail":{"enabled":true}}`;

const PLUS_MODULES = `{"dashboard":{"enabled":true},"patients":{"enabled":true},"appointments":{"enabled":true},"queue":{"enabled":true},"encounters":{"enabled":true},"analytics":{"enabled":true},"consents":{"enabled":true},"audit":{"enabled":true},"labs":{"enabled":true},"tasks":{"enabled":true},"documents":{"enabled":true},"reports":{"enabled":true},"availability":{"enabled":true},"catalogs":{"enabled":true},"communications":{"enabled":true},"locations":{"enabled":true},"waitlist":{"enabled":true},"billing":{"enabled":true},"payments":{"enabled":true},"inventory":{"enabled":true},"automation":{"enabled":true},"campaigns":{"enabled":true},"settings":{"enabled":true},"plan":{"enabled":true},"help":{"enabled":true}}`;
const PLUS_FEATURES = `{"patients":{"enabled":true,"limit":null},"staff":{"enabled":true,"limit":null},"doctors":{"enabled":true,"limit":null},"appointments_month":{"enabled":true,"limit":null},"storage_gb":{"enabled":true,"limit":100},"crm":{"enabled":true},"campaigns":{"enabled":true},"automation":{"enabled":true},"advanced_reports":{"enabled":true},"financial_reports":{"enabled":true},"basic_reports":{"enabled":true},"patient_portal":{"enabled":true},"online_booking":{"enabled":true},"sms_reminders":{"enabled":true},"email_reminders":{"enabled":true},"multi_branch":{"enabled":true},"priority_support":{"enabled":true},"audit_trail":{"enabled":true}}`;

const modulesOf = (json: string) => parsePlanModules(json);
const featuresOf = (json: string) => parsePlanFeatures(json);

function entitlementsFor(
  plan: "free" | "clinic" | "plus",
  overrides: Array<{ key: string; enabled: boolean; limit?: number | null }> = [],
) {
  const modulesJson = plan === "free" ? FREE_MODULES : plan === "clinic" ? CLINIC_MODULES : PLUS_MODULES;
  const featuresJson = plan === "free" ? FREE_FEATURES : plan === "clinic" ? CLINIC_FEATURES : PLUS_FEATURES;
  const modules = modulesOf(modulesJson);
  const features = featuresOf(featuresJson);
  for (const override of overrides) {
    if (override.key in modules) {
      modules[override.key] = { ...modules[override.key], enabled: override.enabled };
    }
    if (override.key in features) {
      features[override.key] = {
        ...features[override.key],
        enabled: override.enabled,
        limit: override.limit,
      };
    }
  }
  return {
    orgId: "test-org",
    plan: {
      id: `plan_${plan}`,
      code: plan,
      nameEn: plan,
      nameAr: plan,
      price: plan === "free" ? 0 : plan === "clinic" ? 99 : 249,
      currency: "USD",
      billingCycle: "monthly",
      trialDays: 0,
      popular: plan === "clinic",
      displayOrder: plan === "free" ? 10 : plan === "clinic" ? 20 : 30,
      status: "active",
      upgradeTargetCode: plan === "free" ? "clinic" : plan === "clinic" ? "plus" : null,
      downgradeTargetCodes: plan === "free" ? [] : plan === "clinic" ? ["free"] : ["free", "clinic"],
    },
    modules: Object.fromEntries(
      Object.entries(modules).map(([key, config]) => [key, config?.enabled === true]),
    ),
    features,
    overrides: [] as OverrideDto[],
    source: "plan" as const,
  } satisfies ResolvedEntitlements;
}

describe("entitlements catalog", () => {
  it("fills every module def with a nav_* label that has en/ar text", () => {
    for (const code of MODULE_ORDER_KEYS) {
      expect(MODULE_DEFS[code], code).toBeDefined();
      const key = MODULE_DEFS[code].labelKey;
      expect(key).toMatch(/^nav_/);
      expect(en[key as keyof typeof en]).toBeTruthy();
      expect(ar[key as keyof typeof ar]).toBeTruthy();
    }
  });

  it("fills every feature def with a mtr_* label and matches LIMIT_KEYS", () => {
    for (const code of FEATURE_ORDER) {
      expect(FEATURE_DEFS[code], code).toBeDefined();
      const key = FEATURE_DEFS[code].labelKey;
      expect(key).toMatch(/^mtr_/);
      expect(en[key as keyof typeof en]).toBeTruthy();
      expect(ar[key as keyof typeof ar]).toBeTruthy();
    }
    expect(LIMIT_KEYS).toEqual([
      "patients",
      "staff",
      "doctors",
      "appointments_month",
      "storage_gb",
    ]);
  });

  it("flags exactly the premium modules", () => {
    expect(PREMIUM_MODULES.has("billing")).toBe(true);
    expect(PREMIUM_MODULES.has("payments")).toBe(true);
    expect(PREMIUM_MODULES.has("communications")).toBe(true);
    expect(PREMIUM_MODULES.has("campaigns")).toBe(true);
    expect(PREMIUM_MODULES.has("automation")).toBe(true);
    expect(PREMIUM_MODULES.has("patients")).toBe(false);
  });
});

describe("plan module gating", () => {
  it.each([
    ["free", ["billing", "payments", "communications", "campaigns", "automation"]],
    ["clinic", ["automation", "campaigns"]],
    ["plus", []],
  ])("%s disables exactly {%s}", (plan: string, locked: string[]) => {
    const modules = modulesOf(plan === "free" ? FREE_MODULES : plan === "clinic" ? CLINIC_MODULES : PLUS_MODULES);
    for (const modKey of PREMIUM_MODULES) {
      expect(modules[modKey]?.enabled, `${plan}/${modKey}`).toBe(
        !locked.includes(modKey),
      );
    }
  });

  it("free keeps core modules available", () => {
    const modules = modulesOf(FREE_MODULES);
    expect(modules["patients"].enabled).toBe(true);
    expect(modules["appointments"].enabled).toBe(true);
    expect(modules["settings"].enabled).toBe(true);
  });
});

describe("plan feature limits", () => {
  it("gives free strict limits", () => {
    const features = featuresOf(FREE_FEATURES);
    expect(features["patients"].limit).toBe(50);
    expect(features["staff"].limit).toBe(2);
    expect(features["doctors"].limit).toBe(1);
    expect(features["appointments_month"].limit).toBe(200);
    expect(features["audit_trail"].enabled).toBe(true);
    expect(features["advanced_reports"].enabled).toBe(false);
  });

  it("gives clinic generous limits and financial reports", () => {
    const features = featuresOf(CLINIC_FEATURES);
    expect(features["patients"].limit).toBe(500);
    expect(features["staff"].limit).toBe(10);
    expect(features["financial_reports"].enabled).toBe(true);
    expect(features["advanced_reports"].enabled).toBe(false);
    expect(features["multi_branch"].enabled).toBe(false);
  });

  it("gives plus unlimited patient/staff/appointments", () => {
    const features = featuresOf(PLUS_FEATURES);
    expect(isUnlimitedValue(features["patients"].limit)).toBe(true);
    expect(isUnlimitedValue(features["staff"].limit)).toBe(true);
    expect(isUnlimitedValue(features["appointments_month"].limit)).toBe(true);
    expect(asLimit(features["patients"].limit)).toBe(999_999_999);
    expect(features["campaigns"].enabled).toBe(true);
    expect(features["automation"].enabled).toBe(true);
  });

  it("treats null as unlimited and 0 as zero-limit", () => {
    expect(isUnlimitedValue(null)).toBe(true);
    expect(isUnlimitedValue(999_999_999)).toBe(true);
    expect(isUnlimitedValue(100)).toBe(false);
    expect(asLimit(null)).toBe(999_999_999);
    expect(asLimit(0)).toBe(0);
  });
});

describe("computeLimitUsage", () => {
  it("marks a free org at 100% patients as near-limit", () => {
    const entitlements = entitlementsFor("free");
    const usage = { patients: 50, staff: 1, doctors: 1, appointmentsMonth: 100 };
    const rows = computeLimitUsage(entitlements, usage);
    const patients = rows.find((row) => row.key === "patients");
    expect(patients?.used).toBe(50);
    expect(patients?.limit).toBe(50);
    expect(patients?.percent).toBe(100);
    expect(patients?.nearLimit).toBe(true);
    expect(patients?.unlimited).toBe(false);
  });

  it("keeps plus unlimited rows at zero percent (unlimited)", () => {
    const entitlements = entitlementsFor("plus");
    const usage = { patients: 12_000, staff: 40, doctors: 8, appointmentsMonth: 90_000 };
    const rows = computeLimitUsage(entitlements, usage);
    const patients = rows.find((row) => row.key === "patients");
    expect(patients?.unlimited).toBe(true);
    expect(patients?.nearLimit).toBe(false);
    const storage = rows.find((row) => row.key === "storage_gb");
    expect(storage?.limit).toBe(100);
  });

  it("honors a feature-level override that removes the limit", () => {
    const entitlements = entitlementsFor("free", [
      { key: "patients", enabled: true, limit: null },
    ]);
    const usage = { patients: 10_000, staff: 2, doctors: 1, appointmentsMonth: 500 };
    const patients = computeLimitUsage(entitlements, usage).find(
      (row) => row.key === "patients",
    );
    expect(patients?.unlimited).toBe(true);
    expect(patients?.nearLimit).toBe(false);
  });
});

describe("i18n dictionary parity", () => {
  it("en and ar expose the same key set (entitlements & plans block)", () => {
    const enKeys = new Set(Object.keys(en));
    const arKeys = new Set(Object.keys(ar));

    const extraInAr = [...arKeys].filter((key) => !enKeys.has(key) && key.includes("_"));
    const missingInAr = [...enKeys].filter((key) => !arKeys.has(key) && key.includes("_"));

    expect([...extraInAr].map((key) => `only in ar: ${key}`)).toEqual([]);
    expect([...missingInAr].map((key) => `only in en: ${key}`)).toEqual([]);
  });
});