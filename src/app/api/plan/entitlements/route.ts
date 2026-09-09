import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getEntitlementsWithUsage } from "@/lib/entitlements/access";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const { entitlements, usage, limitUsage } = await getEntitlementsWithUsage(orgId);

    return NextResponse.json({
      orgId,
      plan: entitlements.plan,
      modules: entitlements.modules,
      features: entitlements.features,
      overrides: entitlements.overrides,
      source: entitlements.source,
      usage,
      limitUsage,
    });
  } catch (error) {
    logServerError("GET /api/plan/entitlements error", error);
    return NextResponse.json(
      { error: "Failed to load plan entitlements" },
      { status: 500 },
    );
  }
}