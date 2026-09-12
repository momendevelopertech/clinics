import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { categorizeInventoryAlerts } from "@/lib/inventory-alerts";

/** GET /api/inventory/alerts — server-computed low-stock / expiry digest. */
export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "inventory");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:read", resource: "inventory" },
    ]);
    if (authz.response) return authz.response;

    const items = await prisma.inventoryItem.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, quantity: true, reorderLevel: true, expiryDate: true, batchNumber: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ ...categorizeInventoryAlerts(items), generatedAt: new Date().toISOString() });
  } catch (error) {
    logServerError("Error computing inventory alerts", error);
    return NextResponse.json({ error: "Failed to compute alerts" }, { status: 500 });
  }
}

/**
 * CRON POST /api/inventory/alerts — daily digest. Creates one in-app
 * Notification per active staff member when alerts exist, deduped by
 * (organizationId, entityType=inventory_digest, entityId=<YYYY-MM-DD>) so a
 * day produces at most one digest per person. No alerts → no notifications.
 */
export async function POST(request: NextRequest) {
  try {
    const cronAuth = authorizeCronRequest(request);
    if (!cronAuth.ok) return cronAuth.response;

    const orgs = await prisma.organization.findMany({
      where: { status: "active" },
      select: { id: true },
    });
    const today = new Date().toISOString().split("T")[0];
    let digests = 0;

    for (const org of orgs) {
      const items = await prisma.inventoryItem.findMany({
        where: { organizationId: org.id },
        select: { id: true, name: true, quantity: true, reorderLevel: true, expiryDate: true, batchNumber: true },
      });
      const { expired, expiringSoon, lowStock } = categorizeInventoryAlerts(items);
      const total = expired.length + expiringSoon.length + lowStock.length;
      if (total === 0) continue;

      const entityId = `${org.id}:${today}`;
      const already = await prisma.notification.findFirst({
        where: { organizationId: org.id, entityType: "inventory_digest", entityId },
        select: { id: true },
      });
      if (already) continue;

      const staff = await prisma.user.findMany({
        where: { organizationId: org.id, active: true },
        select: { id: true },
        take: 50,
      });
      const body = [
        expired.length > 0 ? `${expired.length} expired` : null,
        expiringSoon.length > 0 ? `${expiringSoon.length} expiring within 30 days` : null,
        lowStock.length > 0 ? `${lowStock.length} below reorder level` : null,
      ]
        .filter(Boolean)
        .join(", ");
      await prisma.notification.createMany({
        data: staff.map((s) => ({
          organizationId: org.id,
          recipientId: s.id,
          channel: "in_app",
          title: "Inventory alert",
          body: `Stock needs attention: ${body}.`,
          entityType: "inventory_digest",
          entityId,
        })),
        skipDuplicates: true,
      });
      digests += 1;
    }
    return NextResponse.json({ ok: true, digests, date: today });
  } catch (error) {
    logServerError("Inventory digest cron failed", error);
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}
