import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { logServerError } from "@/lib/safe-logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.ok) {
      return NextResponse.json(guard.error, { status: guard.status });
    }
    const { id } = await params;

    const source = await prisma.plan.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const duplicated = await prisma.plan.create({
      data: {
        code: `${source.code}-copy-${Date.now().toString(36)}`,
        internalCode: null,
        nameEn: `${source.nameEn} (Copy)`,
        nameAr: `${source.nameAr} (نسخة)`,
        descriptionEn: source.descriptionEn,
        descriptionAr: source.descriptionAr,
        price: source.price,
        billingCycle: source.billingCycle,
        status: "archived",
        displayOrder: 999,
        popular: false,
        trialDays: source.trialDays,
        modulesJson: source.modulesJson,
        featuresJson: source.featuresJson,
        upgradeTargetId: null,
        downgradeTargetIdsJson: "[]",
        downgradesAllowed: source.downgradesAllowed,
      },
    });

    return NextResponse.json({ plan: duplicated }, { status: 201 });
  } catch (error) {
    logServerError(`POST /api/super/plans/${String((await params).id)}/duplicate error`, error);
    return NextResponse.json(
      { error: "Failed to duplicate plan" },
      { status: 500 },
    );
  }
}