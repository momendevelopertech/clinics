import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const orgs = await prisma.organization.findMany({
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

  return NextResponse.json({ orgs });
}