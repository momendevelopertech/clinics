import { prisma } from "./prisma";
import { checkPlanLimit as checkEntitledPlanLimit } from "@/lib/entitlements/access";

export type PlanName = "free" | "clinic" | "plus";

export const PLAN_IDS = ["free", "clinic", "plus"] as const;

export type PlanLimits = {
  maxPatients: number;
  maxStaff: number;
  maxAppointmentsPerMonth: number;
};

export const PLANS: Record<PlanName, PlanLimits> = {
  free: {
    maxPatients: 50,
    maxStaff: 2,
    maxAppointmentsPerMonth: 200,
  },
  clinic: {
    maxPatients: 500,
    maxStaff: 10,
    maxAppointmentsPerMonth: 5_000,
  },
  plus: {
    maxPatients: 999_999,
    maxStaff: 999_999,
    maxAppointmentsPerMonth: 999_999_999,
  },
};

export function isPlanName(value: string | null | undefined): value is PlanName {
  return value === "free" || value === "clinic" || value === "plus";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLANS[isPlanName(plan) ? plan : "free"];
}

export async function getOrgUsage(organizationId: string) {
  const [patientsCount, staffCount, appointmentsThisMonth] = await Promise.all([
    prisma.patient.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId } }),
    prisma.appointment.count({
      where: {
        organizationId,
        startTime: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return { patientsCount, staffCount, appointmentsThisMonth };
}

export type UsageCheckResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Enforce plan limits before creating a patient / staff user / appointment.
 * Delegates to the DB-backed entitlements engine (Plan.featuresJson limits),
 * falling back to a static snapshot if no subscription row exists yet.
 */
export async function checkPlanLimit(
  organizationId: string,
  resource: "patients" | "staff" | "appointments",
): Promise<UsageCheckResult> {
  try {
    const result = await checkEntitledPlanLimit(organizationId, resource);
    if (result.allowed) return { allowed: true };
    return { allowed: false, reason: result.reason };
  } catch {
    // Fall back to the static snapshot (e.g. migrations not yet applied).
  }
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  const limits = getPlanLimits(organization?.plan);
  if (resource === "patients") {
    const count = await prisma.patient.count({ where: { organizationId } });
    if (count >= limits.maxPatients) {
      return {
        allowed: false,
        reason: `Your plan allows up to ${limits.maxPatients} patients. Please upgrade to continue adding patients.`,
      };
    }
    return { allowed: true };
  }
  if (resource === "staff") {
    const count = await prisma.user.count({ where: { organizationId } });
    if (count >= limits.maxStaff) {
      return {
        allowed: false,
        reason: `Your plan allows up to ${limits.maxStaff} staff accounts. Please upgrade to add more staff.`,
      };
    }
    return { allowed: true };
  }
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const count = await prisma.appointment.count({
    where: { organizationId, startTime: { gte: monthStart } },
  });
  if (count >= limits.maxAppointmentsPerMonth) {
    return {
      allowed: false,
      reason: `Your plan allows up to ${limits.maxAppointmentsPerMonth} appointments per month. Please upgrade to continue.`,
    };
  }
  return { allowed: true };
}