import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const upgradeBodySchema = z.object({
  approve: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const orgId = (await params).orgId;
  const parsed = upgradeBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "approve is required" }, { status: 400 });
  }
  const body = parsed.data;

  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, upgradeRequestedPlan: true, name: true, slug: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (existing.slug === "platform-admin") {
    return NextResponse.json({ error: "Platform organization is not a clinic" }, { status: 400 });
  }

  if (!existing.upgradeRequestedPlan) {
    return NextResponse.json({ error: "No pending upgrade request" }, { status: 400 });
  }

  const requested = existing.upgradeRequestedPlan;
  const requestedPlan = await prisma.plan.findUnique({ where: { code: requested } });
  if (!requestedPlan) {
    return NextResponse.json({ error: "Invalid requested plan" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
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

    if (body.approve) {
      await tx.subscription.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          planId: requestedPlan.id,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30),
          billingCycle: requestedPlan.billingCycle,
        },
        update: {
          planId: requestedPlan.id,
          status: "active",
          cancelAtPeriodEnd: false,
          canceledAt: null,
          billingCycle: requestedPlan.billingCycle,
        },
      });
    }

    return org;
  });

  await createAuditLog({
    organizationId: orgId,
    userId: guard.userId,
    action: "UPDATE",
    entityType: body.approve
      ? "platform_organization_plan_upgrade"
      : "platform_organization_plan_upgrade_declined",
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