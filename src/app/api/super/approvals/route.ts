import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const [clinicSignups, planUpgrades] = await Promise.all([
    prisma.organization.findMany({
      where: { status: "pending", NOT: { slug: "platform-admin" } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        onboardingSource: true,
        createdAt: true,
        users: {
          select: { name: true, email: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
    prisma.organization.findMany({
      where: {
        upgradeRequestedPlan: { not: null },
        NOT: { slug: "platform-admin" },
      },
      orderBy: { upgradeRequestedAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        upgradeRequestedPlan: true,
        upgradeRequestedAt: true,
        upgradeNote: true,
      },
    }),
  ]);

  return NextResponse.json({ clinicSignups, planUpgrades });
}
