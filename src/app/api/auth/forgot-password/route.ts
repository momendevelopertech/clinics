import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateOpaqueToken,
  hashToken,
  sendAuthEmail,
  getAppUrl,
} from "@/lib/email";
import { logServerError } from "@/lib/safe-logger";

const schema = z.object({ email: z.string().trim().email() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!user) {
      // No account enumeration: always return the same generic message.
      return NextResponse.json({ ok: true });
    }

    // Reset-link throttle: one token per 60s per account.
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { resetTokenExp: true },
    });
    if (existing?.resetTokenExp) {
      const tokenCreatedAt = existing.resetTokenExp.getTime() - 1000 * 60 * 60;
      if (Date.now() - tokenCreatedAt < 1000 * 60) {
        return NextResponse.json({ ok: true, throttled: true });
      }
    }

    const token = generateOpaqueToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: hashToken(token),
        resetTokenExp: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await sendAuthEmail({
      to: email,
      subject: "Reset your password",
      body: `Hi ${user.name ?? "there"}, we received a request to reset your HealthCRM password. This link expires in 1 hour.`,
      ctaUrl: resetUrl,
      ctaLabel: "Reset password",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Forgot-password request failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}