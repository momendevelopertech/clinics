import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { inventoryCreateSchema } from "@/lib/validations/ops";

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
      orderBy: { name: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    logServerError("Error fetching inventory", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "inventory");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:write", resource: "inventory" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = inventoryCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid inventory payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { name, sku, category, quantity, reorderLevel, unit } = parsed.data;

    const item = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const inv = await tx.inventoryItem.create({
        data: {
          organizationId: orgId,
          name: String(name),
          sku: sku || null,
          category: category || null,
          quantity: typeof quantity === "number" ? quantity : 0,
          reorderLevel: typeof reorderLevel === "number" ? reorderLevel : null,
          unit: unit || "each",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "InventoryItem",
          entityId: inv.id,
          afterState: JSON.stringify(inv),
        },
      });

      return inv;
      },
    );

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    logServerError("Error creating inventory item", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 },
    );
  }
}
