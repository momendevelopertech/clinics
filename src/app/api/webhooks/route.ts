import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/roles";
import { requireOrgContext } from "@/lib/org";
import { encryptJson } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { z } from "zod";

const EVENT_TYPES = [
  "patient.created",
  "patient.updated",
  "observation.created",
  "appointment.created",
] as const;

const createSchema = z.object({
  url: z.string().url(),
  eventTypes: z.array(z.enum(EVENT_TYPES)).min(1),
});

/**
 * Outgoing webhook endpoints (Owner only).
 */
export async function GET() {
  try {
    const owner = await requireOwner({ json: true }).catch(() => null);
    if (!owner?.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { organizationId } = await requireOrgContext();
    const webhooks = await prisma.webhook.findMany({
      where: { organizationId },
      select: {
        id: true,
        url: true,
        eventTypes: true,
        active: true,
        createdAt: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      webhooks: webhooks.map((webhook) => ({
        id: webhook.id,
        url: webhook.url,
        eventTypes: JSON.parse(webhook.eventTypes) as string[],
        active: webhook.active,
        createdAt: webhook.createdAt.toISOString(),
        deliveryCount: webhook._count.deliveries,
      })),
    });
  } catch (error) {
    logServerError("Failed to list webhooks", error);
    return NextResponse.json({ error: "Failed to list webhooks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner({ json: true }).catch(() => null);
    if (!owner?.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const context = await requireOrgContext();
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const secret = randomBytes(32).toString("hex");
    const webhook = await prisma.webhook.create({
      data: {
        organizationId: context.organizationId,
        url: parsed.data.url,
        secretHash: encryptJson({ secret }),
        eventTypes: JSON.stringify(parsed.data.eventTypes),
      },
      select: { id: true, url: true, eventTypes: true, active: true, createdAt: true },
    });

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "Webhook",
      entityId: webhook.id,
      afterState: JSON.stringify({ url: webhook.url }),
    });

    return NextResponse.json(
      {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          eventTypes: parsed.data.eventTypes,
          active: true,
          createdAt: webhook.createdAt.toISOString(),
        },
        secret,
        message: "Deliveries are signed with X-Webhook-Signature: sha256=<hmac>.",
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Failed to create webhook", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}