import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "inventory");
    if (moduleAuthz.response) return moduleAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:write", resource: "inventory" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const { type, quantity, reason } = body;

    if (!type || !["restock", "usage", "adjustment"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be restock, usage, or adjustment" },
        { status: 400 }
      );
    }

    const qty = typeof quantity === "number" ? quantity : 0;
    if (qty === 0) {
      return NextResponse.json(
        { error: "Quantity must be non-zero" },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId: orgId },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const delta = type === "restock" ? qty : type === "usage" ? -qty : qty;
    const newQuantity = Math.max(0, item.quantity + delta);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId,
          type,
          quantity: type === "usage" ? -qty : qty,
          reason: reason || null,
        },
      });

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      });

      await createAuditLog({
        organizationId: orgId,
        userId,
        action: "UPDATE",
        entityType: "InventoryItem",
        entityId: itemId,
        beforeState: JSON.stringify({ quantity: item.quantity }),
        afterState: JSON.stringify({
          quantity: newQuantity,
          transactionId: transaction.id,
          transactionType: type,
          delta,
        }),
        db: tx,
      });
    });

    const updated = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error recording inventory transaction", error);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 }
    );
  }
}
