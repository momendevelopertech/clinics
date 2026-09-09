import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { planUpdateSchema } from "@/lib/validations/plan";
import { logServerError } from "@/lib/safe-logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }
  const { id } = await params;

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      upgradeTarget: { select: { id: true, code: true, nameEn: true, nameAr: true } },
      upgradedFrom: { select: { id: true, code: true, nameEn: true, nameAr: true } },
    },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.ok) {
      return NextResponse.json(guard.error, { status: guard.status });
    }
    const { id } = await params;

    const parsed = planUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.upgradeTargetId === id) {
      return NextResponse.json(
        { error: "A plan cannot be its own upgrade target" },
        { status: 400 },
      );
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.internalCode !== undefined
          ? { internalCode: data.internalCode ?? null }
          : {}),
        ...(data.nameEn !== undefined ? { nameEn: data.nameEn } : {}),
        ...(data.nameAr !== undefined ? { nameAr: data.nameAr } : {}),
        ...(data.descriptionEn !== undefined
          ? { descriptionEn: data.descriptionEn }
          : {}),
        ...(data.descriptionAr !== undefined
          ? { descriptionAr: data.descriptionAr }
          : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.billingCycle !== undefined
          ? { billingCycle: data.billingCycle }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.displayOrder !== undefined
          ? { displayOrder: data.displayOrder }
          : {}),
        ...(data.popular !== undefined ? { popular: data.popular } : {}),
        ...(data.trialDays !== undefined ? { trialDays: data.trialDays } : {}),
        ...(data.modulesJson !== undefined
          ? { modulesJson: data.modulesJson ?? null }
          : {}),
        ...(data.featuresJson !== undefined
          ? { featuresJson: data.featuresJson ?? null }
          : {}),
        ...(data.upgradeTargetId !== undefined
          ? { upgradeTargetId: data.upgradeTargetId ?? null }
          : {}),
        ...(data.downgradeTargetIdsJson !== undefined
          ? { downgradeTargetIdsJson: data.downgradeTargetIdsJson }
          : {}),
        ...(data.downgradesAllowed !== undefined
          ? { downgradesAllowed: data.downgradesAllowed }
          : {}),
      },
      include: {
        upgradeTarget: { select: { id: true, code: true, nameEn: true } },
      },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    logServerError(`PATCH /api/super/plans/${String((await params).id)} error`, error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.ok) {
      return NextResponse.json(guard.error, { status: guard.status });
    }
    const { id } = await params;

    const subscriptions = await prisma.subscription.count({ where: { planId: id } });
    if (subscriptions > 0) {
      await prisma.plan.update({
        where: { id },
        data: { status: "archived" },
      });
      return NextResponse.json({
        plan: { id, status: "archived" },
        archived: true,
        message: "Plan has active subscriptions and was archived instead.",
      });
    }

    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    logServerError(`DELETE /api/super/plans/${String((await params).id)} error`, error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}