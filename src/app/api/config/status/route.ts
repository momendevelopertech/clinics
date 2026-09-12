import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllFeatureConfigStatuses } from "@/lib/feature-config";
import { logServerError } from "@/lib/safe-logger";

/**
 * GET /api/config/status — which env-dependent features are configured.
 *
 * Returns booleans + missing variable *names* only (never secret values).
 * Requires an authenticated session; every dashboard user may read it
 * (badges/banners are display-only, enforcement stays server-side).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ features: getAllFeatureConfigStatuses() });
  } catch (error) {
    logServerError("Config status error", error);
    return NextResponse.json({ error: "Failed to load config status" }, { status: 500 });
  }
}
