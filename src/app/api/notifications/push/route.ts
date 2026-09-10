import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, p256dh, auth: authKey } = body;

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: "Missing push subscription fields" },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent") || undefined;

    const subscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint_userId: {
          endpoint,
          userId: session.user.id,
        },
      },
      update: {
        p256dh,
        auth: authKey,
        userAgent,
      },
      create: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        endpoint,
        p256dh,
        auth: authKey,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true, id: subscription.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint" },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
