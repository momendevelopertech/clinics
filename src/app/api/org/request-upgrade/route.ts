import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { PLAN_IDS } from "@/lib/plans";

export async function POST(request: Request) {
  const orgGuard = await requireOrgContext().catch(() => null);
  if (!orgGuard) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const owner = await requireOwner({ json: true });
  if (!owner.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    note?: string;
  };

  if (!body.plan || !(PLAN_IDS as readonly string[]).includes(body.plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  const { organizationId, userId } = orgGuard;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, upgradeRequestedPlan: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.plan === body.plan) {
    return NextResponse.json(
      { error: "Already on this plan" },
      { status: 400 },
    );
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      upgradeRequestedPlan: body.plan,
      upgradeRequestedAt: new Date(),
      upgradeNote: note || null,
    },
    select: {
      id: true,
      plan: true,
      upgradeRequestedPlan: true,
      upgradeRequestedAt: true,
    },
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "UPDATE",
    entityType: "organization_plan_upgrade_request",
    entityId: organizationId,
    beforeState: JSON.stringify({ plan: org.plan, requested: org.upgradeRequestedPlan }),
    afterState: JSON.stringify({ plan: updated.plan, requested: updated.upgradeRequestedPlan }),
  });

  return NextResponse.json({ ok: true, upgrade: updated });
}