import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { planCreateSchema } from "@/lib/validations/plan";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const plans = await prisma.plan.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { subscriptions: true } },
      upgradeTarget: { select: { id: true, code: true, nameEn: true, nameAr: true } },
      upgradedFrom: { select: { id: true, code: true } },
    },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.ok) {
      return NextResponse.json(guard.error, { status: guard.status });
    }

    const parsed = planCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const existing = await prisma.plan.findUnique({ where: { code: data.code } });
    if (existing) {
      return NextResponse.json(
        { error: "A plan with this code already exists" },
        { status: 409 },
      );
    }

    const plan = await prisma.plan.create({
      data: {
        code: data.code,
        internalCode: data.internalCode ?? null,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        price: data.price,
        billingCycle: data.billingCycle,
        status: data.status,
        displayOrder: data.displayOrder,
        popular: data.popular,
        trialDays: data.trialDays,
        modulesJson: data.modulesJson ?? null,
        featuresJson: data.featuresJson ?? null,
        upgradeTargetId: data.upgradeTargetId ?? null,
        downgradeTargetIdsJson: data.downgradeTargetIdsJson,
        downgradesAllowed: data.downgradesAllowed,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    logServerError("POST /api/super/plans error", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 },
    );
  }
}