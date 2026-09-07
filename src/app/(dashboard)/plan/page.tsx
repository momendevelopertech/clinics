import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgUsage, getPlanLimits } from "@/lib/plans";
import { requireOwner } from "@/lib/roles";
import { getDictionary } from "@/lib/i18n/server";
import { PlanDashboard } from "@/components/plan/plan-dashboard";

async function getSession() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return null;
  }
  return session;
}

export default async function PlanPage() {
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
    },
  });

  if (!org) redirect("/login");

  const usage = await getOrgUsage(orgId);
  const limits = getPlanLimits(org.plan);
  const ownerGuard = await requireOwner();
  const isOwner = ownerGuard.ok;

  const t = await getDictionary();

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
      }}
      usage={{
        patients: usage.patientsCount,
        staff: usage.staffCount,
        appointments: usage.appointmentsThisMonth,
      }}
      limits={{
        patients: limits.maxPatients,
        staff: limits.maxStaff,
        appointments: limits.maxAppointmentsPerMonth,
      }}
      isOwner={isOwner}
    />
  );
}