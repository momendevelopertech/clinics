import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { logServerError } from "@/lib/safe-logger";

/** GET /api/auth/2fa/status → { enabled } for the current staff user. */
export async function GET() {
  try {
    const ctx = await requireOrgContext().catch(() => null);
    if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, organizationId: ctx.organizationId },
      select: { totpEnabled: true },
    });
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    return NextResponse.json({ enabled: user.totpEnabled });
  } catch (error) {
    logServerError("2FA status failed", error);
    return NextResponse.json({ error: "Failed to load 2FA status" }, { status: 500 });
  }
}
