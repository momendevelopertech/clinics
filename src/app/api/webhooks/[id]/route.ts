import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/roles";
import { requireOrgContext } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { z } from "zod";

const patchSchema = z.object({
  active: z.boolean().optional(),
  url: z.string().url().optional(),
});

/** PATCH /api/webhooks/[id] (Owner) — toggle active / rotate endpoint. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const owner = await requireOwner({ json: true }).catch(() => null);
    if (!owner?.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const context = await requireOrgContext();
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { id } = await params;
    const existing = await prisma.webhook.findFirst({
      where: { id, organizationId: context.organizationId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    await prisma.webhook.update({
      where: { id },
      data: { ...parsed.data },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "UPDATE",
      entityType: "Webhook",
      entityId: id,
      afterState: JSON.stringify(parsed.data),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Failed to update webhook", error);
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }
}

/** DELETE /api/webhooks/[id] (Owner). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const owner = await requireOwner({ json: true }).catch(() => null);
    if (!owner?.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const context = await requireOrgContext();
    const { id } = await params;
    const existing = await prisma.webhook.findFirst({
      where: { id, organizationId: context.organizationId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    await prisma.webhook.delete({ where: { id } });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "DELETE",
      entityType: "Webhook",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Failed to delete webhook", error);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}