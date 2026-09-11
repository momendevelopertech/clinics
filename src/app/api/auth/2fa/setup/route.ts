import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { encryptTotpSecret, generateTotpSecret, totpAuthUrl } from "@/lib/two-factor";

/**
 * POST /api/auth/2fa/setup → { otpauthUrl, qrDataUrl }.
 * Generates a fresh secret (2FA stays OFF until verified). Re-setup while
 * disabled rotates the pending secret.
 */
export async function POST() {
  try {
    const ctx = await requireOrgContext().catch(() => null);
    if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, organizationId: ctx.organizationId },
      select: { id: true, email: true, totpEnabled: true },
    });
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (user.totpEnabled) {
      return NextResponse.json({ error: "Two-factor is already enabled" }, { status: 400 });
    }
    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encryptTotpSecret(secret), totpEnabled: false },
    });
    const otpauthUrl = totpAuthUrl(secret, user.email ?? user.id);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "user_2fa",
      entityId: user.id,
      afterState: JSON.stringify({ setupStarted: true }),
    });
    return NextResponse.json({ otpauthUrl, qrDataUrl });
  } catch (error) {
    logServerError("2FA setup failed", error);
    return NextResponse.json({ error: "Failed to start 2FA setup" }, { status: 500 });
  }
}
