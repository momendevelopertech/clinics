import { FEATURE_DEFS } from "@/lib/entitlements/catalog";
import type { Dictionary } from "@/lib/i18n/locale";

export const LIMIT_KEYS = [
  "patients",
  "staff",
  "doctors",
  "appointments_month",
  "storage_gb",
] as const;

export const FALLBACK_PLANS: PricingPlan[] = [
  {
    code: "free",
    nameEn: "Starter",
    nameAr: "المبتدئ",
    descriptionEn: "For small clinics getting started",
    descriptionAr: "للعيادات الصغيرة التي تبدأ رحلتها",
    price: 0,
    billingCycle: "monthly",
    popular: false,
    trialDays: 0,
    featuresJson: JSON.stringify({
      patients: { enabled: true, limit: 50 },
      staff: { enabled: true, limit: 2 },
      doctors: { enabled: true, limit: 1 },
      appointments_month: { enabled: true, limit: 200 },
      storage_gb: { enabled: true, limit: 1 },
    }),
  },
  {
    code: "clinic",
    nameEn: "Clinic",
    nameAr: "العيادة",
    descriptionEn: "For growing clinics",
    descriptionAr: "للعيادات المتنامية",
    price: 99,
    billingCycle: "monthly",
    popular: true,
    trialDays: 0,
    featuresJson: JSON.stringify({
      patients: { enabled: true, limit: 500 },
      staff: { enabled: true, limit: 10 },
      doctors: { enabled: true, limit: 5 },
      appointments_month: { enabled: true, limit: 5000 },
      storage_gb: { enabled: true, limit: 10 },
      crm: { enabled: true },
      financial_reports: { enabled: true },
      patient_portal: { enabled: true },
      online_booking: { enabled: true },
      sms_reminders: { enabled: true },
      email_reminders: { enabled: true },
    }),
  },
  {
    code: "plus",
    nameEn: "Plus",
    nameAr: "بلس",
    descriptionEn: "For busy multi-doctor clinics",
    descriptionAr: "للعيادات متعددة الأطباء المزدحمة",
    price: 249,
    billingCycle: "monthly",
    popular: false,
    trialDays: 0,
    featuresJson: JSON.stringify({
      patients: { enabled: true, limit: null },
      staff: { enabled: true, limit: null },
      doctors: { enabled: true, limit: null },
      appointments_month: { enabled: true, limit: null },
      storage_gb: { enabled: true, limit: 100 },
      crm: { enabled: true },
      campaigns: { enabled: true },
      automation: { enabled: true },
      advanced_reports: { enabled: true },
      financial_reports: { enabled: true },
      patient_portal: { enabled: true },
      online_booking: { enabled: true },
      sms_reminders: { enabled: true },
      email_reminders: { enabled: true },
      multi_branch: { enabled: true },
      priority_support: { enabled: true },
    }),
  },
];

export type PricingPlan = {
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  billingCycle: string;
  popular: boolean;
  trialDays: number;
  modulesJson?: string | null;
  featuresJson?: string | null;
};

type PlanFeatureConfig = {
  enabled?: boolean;
  limit?: number | null;
};

export function parseFeatures(json: string | null | undefined): Record<string, PlanFeatureConfig> {
  if (!json) return {};
  try {
    return JSON.parse(json) as Record<string, PlanFeatureConfig>;
  } catch {
    return {};
  }
}

export function formatPrice(price: number) {
  return price === 0 ? "$0" : `$${price.toLocaleString("en-US")}`;
}

export function formatLimit(value: number | null) {
  if (value == null || value >= 999_999) return null;
  return value.toLocaleString("en-US");
}

export type PlanHighlight = {
  label: string;
  locked: boolean;
  unlimited: boolean;
};

export function buildPlanHighlights(plan: PricingPlan, t: Dictionary): PlanHighlight[] {
  const features = parseFeatures(plan.featuresJson);
  const highlights: PlanHighlight[] = [];

  for (const key of LIMIT_KEYS) {
    const config = features[key];
    const def = FEATURE_DEFS[key];
    const label = t[def?.labelKey ?? `mtr_${key}`];
    if (!config?.enabled) continue;
    const value = formatLimit(typeof config.limit === "number" ? config.limit : null);
    highlights.push({
      label:
        value == null
          ? t["landing_pricingUnlimited"].replace("{label}", label)
          : t["landing_pricingLimit"].replace("{value}", value).replace("{label}", label),
      locked: false,
      unlimited: value == null,
    });
  }

  const labelKey = (featureKey: string) => {
    const def = FEATURE_DEFS[featureKey];
    return def?.labelKey ?? `mtr_${featureKey}`;
  };
  const premiumFeatures = Object.keys(FEATURE_DEFS).filter(
    (key) => FEATURE_DEFS[key].premium && FEATURE_DEFS[key].kind === "feature",
  );
  const enabledPremium = premiumFeatures.filter((key) => features[key]?.enabled);
  for (const key of enabledPremium) {
    highlights.push({
      label: t[labelKey(key)],
      locked: false,
      unlimited: false,
    });
  }

  return highlights;
}