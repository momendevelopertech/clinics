import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { tokensEqual } from "@/lib/email";
import { logServerError } from "@/lib/safe-logger";

const schema = z.object({
  token: z.string().min(10),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { token, email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        organizationId: true,
        emailVerified: true,
        verifyTokenHash: true,
        verifyTokenExp: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    if (
      !user.verifyTokenHash ||
      !user.verifyTokenExp ||
      user.verifyTokenExp < new Date() ||
      !tokensEqual(token, user.verifyTokenHash)
    ) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verifyTokenHash: null, verifyTokenExp: null },
      }),
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorType: "system",
          actorIdentifier: "verify-email",
          action: "UPDATE",
          entityType: "User",
          entityId: user.id,
          afterState: JSON.stringify({ emailVerified: true }),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Email verification failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}