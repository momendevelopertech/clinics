import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { getPlanLimits } from "@/lib/plans";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const orgs = await prisma.organization.findMany({
    where: { NOT: { slug: "platform-admin" } },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      onboardingSource: true,
      upgradeRequestedPlan: true,
      upgradeRequestedAt: true,
      upgradeNote: true,
      createdAt: true,
      _count: { select: { users: true, patients: true } },
      users: {
        where: { role: { not: null } },
        select: { email: true, role: true, name: true },
        take: 1,
      },
    },
  });

  const orgsWithUsage = await Promise.all(
    orgs.map(async (org) => {
      const [appointmentsThisMonth] = await Promise.all([
        prisma.appointment.count({
          where: {
            organizationId: org.id,
            startTime: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      return {
        ...org,
        usage: {
          patients: org._count.patients,
          staff: org._count.users,
          appointmentsThisMonth,
        },
        limits: getPlanLimits(org.plan),
      };
    }),
  );

  return NextResponse.json({ orgs: orgsWithUsage });
}