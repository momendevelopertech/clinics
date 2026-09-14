import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";

/**
 * G1: Medication DB search — InventoryItem (category=medication) is the
 * drug database (trade + generic + strength + form in `name`, unique `sku`).
 * Returns stock levels so the composer can warn on low/out-of-stock items.
 * GET /api/medications/search?q=&limit= — org-scoped, labs read.
 */
export async function GET(request: Request) {
  try {
    const context = await requireOrgContext();
    const orgId = context.organizationId;
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 20);

    const items = await prisma.inventoryItem.findMany({
      where: {
        organizationId: orgId,
        category: "medication",
        ...(q.length >= 2
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        reorderLevel: true,
        unit: true,
        expiryDate: true,
      },
      orderBy: [{ quantity: "desc" }, { name: "asc" }],
      take: limit,
    });

    return NextResponse.json(
      items.map((item) => ({
        ...item,
        lowStock:
          item.reorderLevel != null ? item.quantity <= item.reorderLevel : false,
        outOfStock: item.quantity <= 0,
      })),
    );
  } catch (error) {
    logServerError("Failed to search medications", error);
    return NextResponse.json(
      { error: "Failed to search medications" },
      { status: 500 },
    );
  }
}
