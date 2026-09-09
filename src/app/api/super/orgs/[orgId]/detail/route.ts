import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { getEntitlementsWithUsage } from "@/lib/entitlements/access";
import { logServerError } from "@/lib/safe-logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.ok) {
      return NextResponse.json(guard.error, { status: guard.status });
    }
    const orgId = (await params).orgId;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        subscription: { include: { plan: { select: { id: true, code: true, nameEn: true, nameAr: true } } } },
        entitlementOverrides: { orderBy: { createdAt: "desc" } },
        users: {
          select: { id: true, name: true, email: true, role: true },
          orderBy: { createdAt: "asc" },
        },
        branches: { select: { id: true, name: true, status: true } },
      },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { entitlements, usage, limitUsage } = await getEntitlementsWithUsage(orgId);

    return NextResponse.json({
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        plan: org.plan,
        onboardingSource: org.onboardingSource,
        createdAt: org.createdAt,
        timezone: org.timezone,
        currency: org.currency,
        upgradeRequestedPlan: org.upgradeRequestedPlan,
        upgradeRequestedAt: org.upgradeRequestedAt,
        upgradeNote: org.upgradeNote,
      },
      subscription: org.subscription,
      overrides: org.entitlementOverrides,
      staff: org.users,
      branches: org.branches,
      entitlements,
      usage,
      limitUsage,
    });
  } catch (error) {
    logServerError("GET /api/super/orgs/[orgId]/detail error", error);
    return NextResponse.json(
      { error: "Failed to load organization detail" },
      { status: 500 },
    );
  }
}