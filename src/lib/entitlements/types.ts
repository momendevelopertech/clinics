export type ModuleConfig = {
  enabled?: boolean;
  notes?: string;
};

export type FeatureConfig = {
  enabled?: boolean;
  limit?: number | null;
  upgradeMessageKey?: string;
};

export type OverrideDto = {
  id: string;
  moduleKey: string | null;
  featureKey: string | null;
  kind: "module_override" | "feature_override" | "limit_override";
  valueJson: string | null;
  reason: string | null;
  expiresAt: string | null;
};

export type ResolvedPlan = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  price: number;
  currency: string;
  billingCycle: string;
  trialDays: number;
  popular: boolean;
  displayOrder: number;
  status: string;
  upgradeTargetCode: string | null;
  downgradeTargetCodes: string[];
};

export type ResolvedEntitlements = {
  orgId: string;
  plan: ResolvedPlan;
  modules: Record<string, boolean>;
  features: Record<string, FeatureConfig>;
  overrides: OverrideDto[];
  source: "plan" | "overridden";
};

export type UsageSnapshot = {
  patients: number;
  staff: number;
  doctors: number;
  appointmentsMonth: number;
};

export type LimitUsage = {
  key: string;
  used: number;
  limit: number;
  unlimited: boolean;
  percent: number;
  nearLimit: boolean;
};

export type EntitlementsDto = {
  orgId: string;
  plan: ResolvedPlan;
  modules: Record<string, boolean>;
  features: Record<string, FeatureConfig>;
  overrides: OverrideDto[];
  source: "plan" | "overridden";
  usage: UsageSnapshot;
  limitUsage: LimitUsage[];
};

export const LIMIT_KEY_UNLIMITED = 999_999_999;

export function isUnlimitedValue(value: number | null | undefined): boolean {
  return value == null || value >= LIMIT_KEY_UNLIMITED;
}

export function asLimit(value: number | null | undefined): number {
  return isUnlimitedValue(value) ? LIMIT_KEY_UNLIMITED : (value ?? 0);
}