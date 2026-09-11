import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "@/lib/validations/notifications";
import { logServerError } from "@/lib/safe-logger";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = pushSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Missing push subscription fields",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { endpoint, p256dh, auth: authKey } = parsed.data;

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
  } catch (error) {
    logServerError("POST /api/notifications/push error", error);
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

    const body = await request.json().catch(() => ({}));
    const parsed = pushUnsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing endpoint" },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: parsed.data.endpoint,
        userId: session.user.id,
        ...(session.user.organizationId
          ? { organizationId: session.user.organizationId }
          : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("DELETE /api/notifications/push error", error);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
