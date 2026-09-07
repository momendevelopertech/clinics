import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { tokensEqual } from "@/lib/email";
import { logServerError } from "@/lib/safe-logger";

const schema = z.object({
  token: z.string().min(10),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { token, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        organizationId: true,
        resetTokenHash: true,
        resetTokenExp: true,
      },
    });

    if (
      !user ||
      !user.resetTokenHash ||
      !user.resetTokenExp ||
      user.resetTokenExp < new Date() ||
      !tokensEqual(token, user.resetTokenHash)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_token" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(password),
          resetTokenHash: null,
          resetTokenExp: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorType: "system",
          actorIdentifier: "reset-password",
          action: "UPDATE",
          entityType: "User",
          entityId: user.id,
          afterState: JSON.stringify({ passwordReset: true }),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Password reset failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}