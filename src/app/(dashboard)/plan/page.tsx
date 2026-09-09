import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireOwner } from "@/lib/roles";
import { getDictionary } from "@/lib/i18n/server";
import {
  resolveOrgEntitlements,
  parsePlanModules,
  parsePlanFeatures,
} from "@/lib/entitlements/resolve";
import { getOrgUsageSnapshot } from "@/lib/entitlements/resolve";
import { computeLimitUsage } from "@/lib/entitlements/access";
import {
  FEATURE_DEFS,
  FEATURE_ORDER,
  LIMIT_KEYS,
  MODULE_DEFS,
  MODULE_ORDER_KEYS,
} from "@/lib/entitlements/catalog";
import { PlanDashboard } from "@/components/plan/plan-dashboard";

type CompareRow =
  | {
      code: string;
      labelKey: string;
      group: string;
      premium: boolean | undefined;
      type: "module";
      values: boolean[];
    }
  | {
      code: string;
      labelKey: string;
      group: string;
      premium: boolean | undefined;
      type: "limit" | "feature";
      values: (number | boolean | null)[];
    };

async function getSession() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return null;
  }
  return session;
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ lock?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const orgId = session.user.organizationId;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      status: true,
      plan: true,
      upgradeRequestedPlan: true,
      upgradeRequestedAt: true,
      upgradeNote: true,
      subscription: {
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
  });

  if (!org) redirect("/login");

  const ownerGuard = await requireOwner();
  const isOwner = ownerGuard.ok;

  const [entitlements, usage, planList] = await Promise.all([
    resolveOrgEntitlements(orgId),
    getOrgUsageSnapshot(orgId),
    prisma.plan.findMany({
      where: { status: "active" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const limitUsage = computeLimitUsage(entitlements, usage);

  const nextPlanCode = entitlements.plan.upgradeTargetCode;
  const nextPlan = planList.find((plan) => plan.code === nextPlanCode) ?? null;
  const currentPlanRow =
    planList.find((plan) => plan.code === entitlements.plan.code) ?? null;

  const t = await getDictionary();

  const currentPlanName =
    entitlements.plan.nameEn && entitlements.plan.nameAr
      ? typeof t[
          `plan_${entitlements.plan.code}PlanName` as keyof typeof t
        ] === "string"
        ? t[`plan_${entitlements.plan.code}PlanName` as keyof typeof t]
        : entitlements.plan.nameEn
      : entitlements.plan.nameEn;

  const plans = planList.map((plan) => {
    return {
      id: plan.code,
      code: plan.code,
      name:
        typeof t[`plan_${plan.code}PlanName` as keyof typeof t] === "string"
          ? t[`plan_${plan.code}PlanName` as keyof typeof t]
          : plan.nameEn,
      tagline:
        typeof t[`plan_${plan.code}Desc` as keyof typeof t] === "string"
          ? t[`plan_${plan.code}Desc` as keyof typeof t]
          : plan.descriptionEn,
      price: Number(plan.price) || 0,
      popular: plan.popular,
      trialDays: plan.trialDays,
    };
  });

  const compareRows: CompareRow[] = [
    ...MODULE_ORDER_KEYS.map((code) => {
      const def = MODULE_DEFS[code];
      return {
        code,
        labelKey: def.labelKey,
        group: def.group,
        premium: def.premium,
        type: "module" as const,
        values: planList.map((plan) => {
          const modules = parsePlanModules(plan.modulesJson);
          return modules[code]?.enabled !== false;
        }),
      };
    }),
    ...FEATURE_ORDER.map((code) => {
      const def = FEATURE_DEFS[code];
      return {
        code,
        labelKey: def.labelKey,
        group: def.group,
        premium: def.premium,
        type: code in LIMIT_KEYS ? ("limit" as const) : ("feature" as const),
        values: planList.map((plan) => {
          const features = parsePlanFeatures(plan.featuresJson);
          const config = features[code];
          if (code in LIMIT_KEYS) {
            const limit = config?.limit ?? null;
            if (limit == null) return null;
            return limit;
          }
          return config?.enabled === true;
        }),
      };
    }),
  ];

  const { lock } = await searchParams;

  return (
    <PlanDashboard
      t={t}
      org={{
        id: org.id,
        plan: org.plan,
        status: org.status,
        upgradeRequestedPlan: org.upgradeRequestedPlan,
        upgradeRequestedAt: org.upgradeRequestedAt?.toISOString() ?? null,
        upgradeNote: org.upgradeNote,
        subscriptionStatus: org.subscription?.status ?? null,
        subscriptionEndsAt: org.subscription?.currentPeriodEnd?.toISOString() ?? null,
      }}
      currentPlan={{
        code: entitlements.plan.code,
        name: currentPlanName,
        price: entitlements.plan.price,
        trialDays: entitlements.plan.trialDays,
        description: currentPlanRow?.descriptionEn ?? entitlements.plan.nameEn,
      }}
      nextPlan={
        nextPlan
          ? {
              code: nextPlan.code,
              name:
                typeof t[`plan_${nextPlan.code}PlanName` as keyof typeof t] === "string"
                  ? t[`plan_${nextPlan.code}PlanName` as keyof typeof t]
                  : nextPlan.nameEn,
              price: Number(nextPlan.price) || 0,
            }
          : null
      }
      limitUsage={limitUsage}
      usage={usage}
      plans={plans}
      compareRows={compareRows}
      isOwner={isOwner}
      lockModule={lock ?? null}
    />
  );
}