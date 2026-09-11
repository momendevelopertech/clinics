import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { inventoryUpdateSchema } from "@/lib/validations/ops";

/** PATCH /api/inventory/[id] — edit item master data (never quantity: stock
 * moves only through /transaction). Used for expiry/batch corrections. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "inventory");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:write", resource: "inventory" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = inventoryUpdateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid inventory payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const { expiryDate, ...rest } = parsed.data;
    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...rest,
        batchNumber: rest.batchNumber?.trim() || null,
        ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: "UPDATE",
        entityType: "InventoryItem",
        entityId: id,
        beforeState: JSON.stringify(existing),
        afterState: JSON.stringify(updated),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating inventory item", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
