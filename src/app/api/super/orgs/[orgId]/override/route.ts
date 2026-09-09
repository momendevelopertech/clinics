import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { overrideCreateSchema } from "@/lib/validations/plan";
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

    const overrides = await prisma.entitlementOverride.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ overrides });
  } catch (error) {
    logServerError("GET /api/super/orgs/[orgId]/override error", error);
    return NextResponse.json(
      { error: "Failed to load overrides" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.ok) {
      return NextResponse.json(guard.error, { status: guard.status });
    }
    const orgId = (await params).orgId;

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, plan: true } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const parsed = overrideCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const override = await prisma.entitlementOverride.create({
      data: {
        organizationId: orgId,
        moduleKey: data.moduleKey ?? null,
        featureKey: data.featureKey ?? null,
        kind: data.kind,
        valueJson: data.valueJson ?? null,
        reason: data.reason ?? null,
        createdById: guard.userId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: guard.userId,
      action: "CREATE",
      entityType: "platform_entitlement_override",
      entityId: override.id,
      afterState: JSON.stringify(data),
    });

    return NextResponse.json({ override }, { status: 201 });
  } catch (error) {
    logServerError("POST /api/super/orgs/[orgId]/override error", error);
    return NextResponse.json(
      { error: "Failed to create override" },
      { status: 500 },
    );
  }
}