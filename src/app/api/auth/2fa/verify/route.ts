import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import {
  decryptTotpSecret,
  generateBackupCodes,
  verifyTotpToken,
} from "@/lib/two-factor";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().trim().min(1).max(32) });

/**
 * POST /api/auth/2fa/verify { token } → enables 2FA, returns one-time
 * backup codes (plaintext shown once, only hashes stored).
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireOrgContext().catch(() => null);
    if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const parsed = tokenSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, organizationId: ctx.organizationId },
      select: { id: true, totpEnabled: true, totpSecret: true },
    });
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (user.totpEnabled) return NextResponse.json({ enabled: true, backupCodes: [] });

    const secret = decryptTotpSecret(user.totpSecret);
    if (!secret || !verifyTotpToken(secret, parsed.data.token)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    const { plain, hashes } = generateBackupCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        totpEnabledAt: new Date(),
        totpBackupCodes: JSON.stringify(hashes),
      },
    });
    await createAuditLog({
      organizationId: ctx.organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "user_2fa",
      entityId: user.id,
      afterState: JSON.stringify({ enabled: true }),
    });
    return NextResponse.json({ enabled: true, backupCodes: plain });
  } catch (error) {
    logServerError("2FA verify failed", error);
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 });
  }
}
