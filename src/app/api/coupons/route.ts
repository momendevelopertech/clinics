import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { couponCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:read", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const coupons = await prisma.coupon.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(coupons);
  } catch (error) {
    logServerError("Error fetching coupons", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "billing");
    if (!planAuthz.ok) return planAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = couponCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (parsed.data.kind === "percent" && parsed.data.value > 100) {
      return NextResponse.json({ error: "Percent discount cannot exceed 100" }, { status: 400 });
    }

    const existing = await prisma.coupon.findFirst({
      where: { organizationId: orgId, code: parsed.data.code },
    });
    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        organizationId: orgId,
        code: parsed.data.code,
        kind: parsed.data.kind,
        value: parsed.data.value,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Coupon",
      entityId: coupon.id,
      afterState: JSON.stringify({ code: coupon.code, kind: coupon.kind }),
    });
    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    logServerError("Error creating coupon", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
