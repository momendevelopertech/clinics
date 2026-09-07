import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { PLAN_IDS } from "@/lib/plans";

type Body = { approve?: boolean };

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

  if (typeof body.approve !== "boolean") {
    return NextResponse.json({ error: "approve is required" }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, upgradeRequestedPlan: true, name: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!existing.upgradeRequestedPlan) {
    return NextResponse.json({ error: "No pending upgrade request" }, { status: 400 });
  }

  const requested = existing.upgradeRequestedPlan;
  if (!(PLAN_IDS as readonly string[]).includes(requested)) {
    return NextResponse.json({ error: "Invalid requested plan" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      plan: body.approve ? requested : existing.plan,
      upgradeRequestedPlan: null,
      upgradeRequestedAt: null,
      upgradeNote: null,
    },
    select: {
      id: true,
      plan: true,
      upgradeRequestedPlan: true,
      upgradeRequestedAt: true,
    },
  });

  await createAuditLog({
    organizationId: orgId,
    userId: guard.userId,
    action: "UPDATE",
    entityType: body.approve ? "organization_plan_upgrade" : "organization_plan_upgrade_declined",
    entityId: orgId,
    beforeState: JSON.stringify({
      plan: existing.plan,
      requested: existing.upgradeRequestedPlan,
    }),
    afterState: JSON.stringify({
      plan: updated.plan,
      requested: null,
    }),
  });

  return NextResponse.json({
    ok: true,
    approved: body.approve,
    org: { id: updated.id, plan: updated.plan },
  });
}