import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const planBodySchema = z.object({
  plan: z.string().trim().min(1).max(80),
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
  const parsed = planBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { code: parsed.data.plan } });
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, name: true, slug: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (existing.slug === "platform-admin") {
    return NextResponse.json({ error: "Platform organization is not a clinic" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: orgId },
      data: {
        plan: plan.code,
        upgradeRequestedPlan: null,
        upgradeRequestedAt: null,
        upgradeNote: null,
      },
      select: { id: true, plan: true },
    });

    await tx.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        planId: plan.id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30),
        billingCycle: plan.billingCycle,
      },
      update: {
        planId: plan.id,
        status: "active",
        cancelAtPeriodEnd: false,
        canceledAt: null,
        billingCycle: plan.billingCycle,
      },
    });

    return org;
  });

  await createAuditLog({
    organizationId: orgId,
    userId: guard.userId,
    action: "UPDATE",
    entityType: "platform_organization_plan",
    entityId: orgId,
    beforeState: JSON.stringify({ plan: existing.plan }),
    afterState: JSON.stringify({ plan: updated.plan }),
  });

  return NextResponse.json({ ok: true, org: updated });
}