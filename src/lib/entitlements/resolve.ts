import { prisma } from "@/lib/prisma";
import type {
  EntitlementsDto,
  FeatureConfig,
  ModuleConfig,
  OverrideDto,
  ResolvedEntitlements,
  ResolvedPlan,
  UsageSnapshot,
} from "@/lib/entitlements/types";

export function parseJsonRecord<T>(json: string | null | undefined): T {
  if (!json) return {} as T;
  try {
    return JSON.parse(json) as T;
  } catch {
    return {} as T;
  }
}

export function parsePlanModules(json: string | null | undefined): Record<string, ModuleConfig> {
  const raw = parseJsonRecord<Record<string, ModuleConfig>>(json);
  const result: Record<string, ModuleConfig> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object") {
      result[key] = {
        enabled: Boolean(value.enabled),
        notes: typeof value.notes === "string" ? value.notes : undefined,
      };
    }
  }
  return result;
}

export function parsePlanFeatures(json: string | null | undefined): Record<string, FeatureConfig> {
  const raw = parseJsonRecord<Record<string, FeatureConfig>>(json);
  const result: Record<string, FeatureConfig> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object") {
      const limit =
        typeof value.limit === "number" ? value.limit : value.limit === null ? null : undefined;
      result[key] = {
        enabled: Boolean(value.enabled),
        limit,
        upgradeMessageKey:
          typeof value.upgradeMessageKey === "string" ? value.upgradeMessageKey : undefined,
      };
    }
  }
  return result;
}

function toResolvedPlan(plan: {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  price: unknown;
  billingCycle: string;
  trialDays: number;
  popular: boolean;
  displayOrder: number;
  status: string;
  upgradeTarget?: { code: string } | null;
  downgradeTargetIdsJson: string | null;
}): ResolvedPlan {
  return {
    id: plan.id,
    code: plan.code,
    nameEn: plan.nameEn,
    nameAr: plan.nameAr,
    price: Number(plan.price) || 0,
    currency: "USD",
    billingCycle: plan.billingCycle,
    trialDays: plan.trialDays,
    popular: plan.popular,
    displayOrder: plan.displayOrder,
    status: plan.status,
    upgradeTargetCode: plan.upgradeTarget?.code ?? null,
    downgradeTargetCodes: parseJsonRecord<string[]>(plan.downgradeTargetIdsJson),
  };
}

function isActiveOverride(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt > new Date();
}

export function resolvePlanEntitlements(plan: {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  price: unknown;
  billingCycle: string;
  trialDays: number;
  popular: boolean;
  displayOrder: number;
  status: string;
  upgradeTarget?: { code: string } | null;
  downgradeTargetIdsJson: string | null;
  modulesJson: string | null;
  featuresJson: string | null;
}): {
  plan: ResolvedPlan;
  modules: Record<string, boolean>;
  features: Record<string, FeatureConfig>;
} {
  const modules = parsePlanModules(plan.modulesJson);
  const features = parsePlanFeatures(plan.featuresJson);
  return {
    plan: toResolvedPlan(plan),
    modules: Object.fromEntries(
      Object.entries(modules).map(([key, value]) => [key, value.enabled !== false]),
    ),
    features,
  };
}

export async function resolveOrgEntitlements(orgId: string): Promise<ResolvedEntitlements> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      entitlementOverrides: {
        select: {
          id: true,
          moduleKey: true,
          featureKey: true,
          kind: true,
          valueJson: true,
          reason: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const plan = await prisma.plan.findUnique({
    where: { code: org?.plan || "free" },
    include: { upgradeTarget: { select: { code: true } } },
  });
  if (!plan) {
    throw new Error(`Plan not found for organization ${orgId}`);
  }

  const base = resolvePlanEntitlements(plan);
  const modules = { ...base.modules };
  const features = { ...base.features };
  const overrides: OverrideDto[] = [];
  const activeOverrides = (org?.entitlementOverrides ?? []).filter((o) =>
    isActiveOverride(o.expiresAt),
  );

  let source: ResolvedEntitlements["source"] = "plan";
  for (const override of activeOverrides) {
    const value = parseJsonRecord<{ enabled?: boolean; limit?: number | null }>(override.valueJson);
    overrides.push({
      id: override.id,
      moduleKey: override.moduleKey,
      featureKey: override.featureKey,
      kind: override.kind as OverrideDto["kind"],
      valueJson: override.valueJson,
      reason: override.reason,
      expiresAt: override.expiresAt ? override.expiresAt.toISOString() : null,
    });

    if (override.kind === "module_override" && override.moduleKey) {
      if (typeof value.enabled === "boolean") {
        modules[override.moduleKey] = value.enabled;
        source = "overridden";
      }
    } else if (override.featureKey) {
      if (typeof value.enabled === "boolean") {
        features[override.featureKey] = {
          ...features[override.featureKey],
          enabled: value.enabled,
        };
        source = "overridden";
      }
      if (typeof value.limit === "number") {
        features[override.featureKey] = {
          ...features[override.featureKey],
          enabled: true,
          limit: value.limit,
        };
        source = "overridden";
      }
    }
  }

  return {
    orgId,
    plan: base.plan,
    modules,
    features,
    overrides,
    source,
  };
}

export async function getOrgUsageSnapshot(orgId: string): Promise<UsageSnapshot> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [patients, staff, doctors, appointmentsMonth] = await Promise.all([
    prisma.patient.count({ where: { organizationId: orgId } }),
    prisma.user.count({ where: { organizationId: orgId } }),
    prisma.user.count({
      where: {
        organizationId: orgId,
        OR: [
          { role: "doctor" },
          { userRoles: { some: { role: { name: "Doctor" } } } },
        ],
      },
    }),
    prisma.appointment.count({
      where: { organizationId: orgId, startTime: { gte: monthStart } },
    }),
  ]);
  return { patients, staff, doctors, appointmentsMonth };
}

export function buildEntitlementsDto(
  entitlements: ResolvedEntitlements,
  usage: UsageSnapshot,
): EntitlementsDto {
  return {
    ...entitlements,
    usage,
    limitUsage: [],
  };
}