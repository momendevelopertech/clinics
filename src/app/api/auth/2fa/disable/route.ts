import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import {
  consumeBackupCode,
  decryptTotpSecret,
  parseBackupHashes,
  verifyTotpToken,
} from "@/lib/two-factor";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().trim().min(1).max(64) });

/**
 * POST /api/auth/2fa/disable { token } — requires a current TOTP code (or an
 * unused backup code) so a briefly-unattended session cannot silently drop
 * the second factor.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireOrgContext().catch(() => null);
    if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const parsed = tokenSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, organizationId: ctx.organizationId },
      select: { id: true, totpEnabled: true, totpSecret: true, totpBackupCodes: true },
    });
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!user.totpEnabled) return NextResponse.json({ enabled: false });

    const secret = decryptTotpSecret(user.totpSecret);
    const tokenOk = secret ? verifyTotpToken(secret, parsed.data.token) : false;
    if (!tokenOk) {
      const consumed = consumeBackupCode(
        parseBackupHashes(user.totpBackupCodes),
        parsed.data.token,
      );
      if (!consumed) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null, totpBackupCodes: null, totpEnabledAt: null },
    });
    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "user_2fa",
      entityId: user.id,
      afterState: JSON.stringify({ enabled: false }),
    });
    return NextResponse.json({ enabled: false });
  } catch (error) {
    logServerError("2FA disable failed", error);
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
  }
}
