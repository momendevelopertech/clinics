import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { PLAN_IDS } from "@/lib/plans";

const VALID_PLANS = PLAN_IDS as readonly string[];

type Body = { plan?: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const orgId = (await params).orgId;
  const body = (await request.json().catch(() => ({}))) as Body;

  if (!body.plan || !VALID_PLANS.includes(body.plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, name: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      plan: body.plan,
      upgradeRequestedPlan: null,
      upgradeRequestedAt: null,
      upgradeNote: null,
    },
    select: { id: true, plan: true },
  });

  await createAuditLog({
    organizationId: orgId,
    userId: guard.userId,
    action: "UPDATE",
    entityType: "organization_plan",
    entityId: orgId,
    beforeState: JSON.stringify({ plan: existing.plan }),
    afterState: JSON.stringify({ plan: updated.plan }),
  });

  return NextResponse.json({ ok: true, org: updated });
}