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
      select: {
        id: true,
        name: true,
        emailVerified: true,
        verifyTokenExp: true,
      },
    });

    if (!user) {
      // Do not leak whether the account exists.
      return NextResponse.json({ ok: true });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    // Resend throttling: allow one new token every 60s per account.
    if (user.verifyTokenExp) {
      const tokenCreatedAt = user.verifyTokenExp.getTime() - 1000 * 60 * 60 * 24;
      if (Date.now() - tokenCreatedAt < 1000 * 60) {
        return NextResponse.json({ ok: true, throttled: true });
      }
    }

    const token = generateOpaqueToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyTokenHash: hashToken(token),
        verifyTokenExp: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    const verifyUrl = `${getAppUrl()}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await sendAuthEmail({
      to: email,
      subject: "Verify your email address",
      body: `Hi ${user.name ?? "there"}, verify your email address to activate your clinic account.`,
      ctaUrl: verifyUrl,
      ctaLabel: "Verify email",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Resend verification failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}