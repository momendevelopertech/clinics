import { NextResponse } from "next/server";
import {
  LIMIT_KEYS,
} from "@/lib/entitlements/catalog";
import {
  asLimit,
  isUnlimitedValue,
  type LimitUsage,
  type ResolvedEntitlements,
  type UsageSnapshot,
} from "@/lib/entitlements/types";
import {
  getOrgUsageSnapshot,
  resolveOrgEntitlements,
} from "@/lib/entitlements/resolve";

export function hasModule(entitlements: ResolvedEntitlements, moduleKey: string): boolean {
  return entitlements.modules[moduleKey] === true;
}

export function hasFeature(entitlements: ResolvedEntitlements, featureKey: string): boolean {
  return entitlements.features[featureKey]?.enabled === true;
}

export function getPlanLimit(
  entitlements: ResolvedEntitlements,
  limitKey: string,
): number {
  return asLimit(entitlements.features[limitKey]?.limit ?? null);
}

export function isUnlimited(entitlements: ResolvedEntitlements, limitKey: string): boolean {
  return isUnlimitedValue(entitlements.features[limitKey]?.limit ?? null);
}

export function computeLimitUsage(
  entitlements: ResolvedEntitlements,
  usage: UsageSnapshot,
): LimitUsage[] {
  const usageMap: Record<string, number> = {
    patients: usage.patients,
    staff: usage.staff,
    doctors: usage.doctors,
    appointments_month: usage.appointmentsMonth,
    storage_gb: 0,
  };

  return LIMIT_KEYS.map((key) => {
    const config = entitlements.features[key];
    const enabled = config?.enabled !== false;
    const rawLimit = config?.limit ?? null;
    const unlimited = !enabled || isUnlimitedValue(rawLimit);
    const limit = asLimit(rawLimit);
    const used = usageMap[key] ?? 0;
    const percent = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
    return {
      key,
      used,
      limit,
      unlimited,
      percent,
      nearLimit: !unlimited && percent >= 80,
    };
  });
}

const PLAN_FEATURE_REQUIRED = "PLAN_FEATURE_REQUIRED";

export function planLockedResponse(
  entitlements: ResolvedEntitlements,
  moduleKey: string,
  featureKey?: string,
  upgradeMessageKey?: string,
): NextResponse {
  return NextResponse.json(
    {
      error: "This feature is not included in your current plan.",
      code: PLAN_FEATURE_REQUIRED,
      plan: entitlements.plan.code,
      upgradePlan: entitlements.plan.upgradeTargetCode,
      module: moduleKey,
      feature: featureKey ?? null,
      upgradeMessageKey: upgradeMessageKey ?? "mtr_upgradeGeneric",
    },
    { status: 402 },
  );
}

export async function requireModuleEntitlement(
  orgId: string,
  moduleKey: string,
  featureKey?: string,
): Promise<
  | { ok: true; entitlements: ResolvedEntitlements }
  | { ok: false; response: NextResponse; entitlements: ResolvedEntitlements }
> {
  const entitlements = await resolveOrgEntitlements(orgId);
  if (hasModule(entitlements, moduleKey)) {
    return { ok: true, entitlements };
  }
  const feature = entitlements.features[featureKey ?? ""];
  return {
    ok: false,
    entitlements,
    response: planLockedResponse(entitlements, moduleKey, featureKey, feature?.upgradeMessageKey),
  };
}

export async function requireFeatureEntitlement(
  orgId: string,
  featureKey: string,
): Promise<
  | { ok: true; entitlements: ResolvedEntitlements }
  | { ok: false; response: NextResponse; entitlements: ResolvedEntitlements }
> {
  const entitlements = await resolveOrgEntitlements(orgId);
  if (hasFeature(entitlements, featureKey)) {
    return { ok: true, entitlements };
  }
  return {
    ok: false,
    entitlements,
    response: planLockedResponse(
      entitlements,
      featureKey,
      featureKey,
      entitlements.features[featureKey]?.upgradeMessageKey,
    ),
  };
}

export type LimitedResource = "patients" | "staff" | "appointments";

export async function checkPlanLimit(
  orgId: string,
  resource: LimitedResource,
): Promise<
  | { allowed: true }
  | { allowed: false; reason: string; limitKey: string; limit: number }
> {
  const [entitlements, usage] = await Promise.all([
    resolveOrgEntitlements(orgId),
    getOrgUsageSnapshot(orgId),
  ]);

  const key: string =
    resource === "appointments" ? "appointments_month" : resource;
  const limit = getPlanLimit(entitlements, key);
  if (isUnlimited(entitlements, key)) {
    return { allowed: true };
  }

  const used =
    resource === "patients"
      ? usage.patients
      : resource === "staff"
        ? usage.staff
        : usage.appointmentsMonth;

  if (used >= limit) {
    return {
      allowed: false,
      reason: `Your plan allows up to ${limit} ${resource} on this plan. Please upgrade to continue.`,
      limitKey: key,
      limit,
    };
  }
  return { allowed: true };
}

export async function isModuleEntitled(orgId: string, moduleKey: string): Promise<boolean> {
  const entitlements = await resolveOrgEntitlements(orgId);
  return hasModule(entitlements, moduleKey);
}

export async function getEntitlementsWithUsage(orgId: string) {
  const [entitlements, usage] = await Promise.all([
    resolveOrgEntitlements(orgId),
    getOrgUsageSnapshot(orgId),
  ]);
  return { entitlements, usage, limitUsage: computeLimitUsage(entitlements, usage) };
}

export { PLAN_FEATURE_REQUIRED };