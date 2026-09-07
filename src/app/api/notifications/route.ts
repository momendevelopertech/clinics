import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { notificationCreateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const { organizationId, userId } = await requireOrgContext();
    const notifications = await prisma.notification.findMany({ where: { organizationId, recipientId: userId }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json(notifications);
  } catch (error) {
    logServerError("Error fetching notifications", error);
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { organizationId, userId } = await requireOrgContext();
    const authz = await requireAnyPermission(organizationId, [{ action: "staff:write", resource: "staff" }]);
    if (authz.response) return authz.response;
    const parsed = notificationCreateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const recipient = await prisma.user.findFirst({ where: { id: parsed.data.recipientId, organizationId }, select: { id: true } });
    if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    const notification = await prisma.notification.create({ data: { ...parsed.data, organizationId, deliveredAt: parsed.data.channel === "in_app" ? new Date() : null } });
    await createAuditLog({ organizationId, userId, action: "CREATE", entityType: "Notification", entityId: notification.id, afterState: JSON.stringify(notification), request });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    logServerError("Error creating notification", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
