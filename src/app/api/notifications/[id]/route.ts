import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { notificationStatusSchema } from "@/lib/validations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId, userId } = await requireOrgContext();
  const parsed = notificationStatusSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const { id } = await params;
  const notification = await prisma.notification.updateMany({ where: { id, organizationId, recipientId: userId }, data: { status: parsed.data.status, readAt: parsed.data.status === "read" ? new Date() : null } });
  if (!notification.count) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
