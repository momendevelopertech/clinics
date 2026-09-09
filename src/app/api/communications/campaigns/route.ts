import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "campaigns");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "campaigns");
    if (!planAuthz.ok) return planAuthz.response;

    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    logServerError("GET /api/communications/campaigns error", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "campaigns");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "campaigns");
    if (!planAuthz.ok) return planAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const { name, type, triggerType } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Campaign name and type are required" },
        { status: 400 },
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: orgId,
        name,
        type,
        triggerType: triggerType || null,
        status: "draft",
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Campaign",
      entityId: campaign.id,
      afterState: JSON.stringify(campaign),
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    logServerError("POST /api/communications/campaigns error", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 },
    );
  }
}
