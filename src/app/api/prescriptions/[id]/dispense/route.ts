import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { z } from "zod";

const dispenseSchema = z.object({
  lines: z
    .array(
      z.object({
        medicationName: z.string().trim().min(1).max(200),
        inventoryItemId: z.string().min(1).nullish(),
        quantity: z.number().int().min(1).max(1000).default(1),
      }),
    )
    .min(1)
    .max(30),
});

/**
 * G5/G8: Dispense flow — pharmacist dispenses a prescription AND deducts
 * stock in one transaction.
 * POST /api/prescriptions/[id]/dispense { lines: [{ medicationName,
 *   inventoryItemId?, quantity }] }
 * - Rx must be active + org-scoped (404 otherwise, 409 if already completed).
 * - Each line with inventoryItemId must belong to the org and be a
 *   medication; insufficient stock → 409 naming the item.
 * - Lines without inventoryItemId are recorded as dispensed without
 *   deduction (e.g. external pharmacy).
 * - On success: usage InventoryTransactions + Rx { completed, sentToPharmacy }.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:write", resource: "inventory" },
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const parsed = dispenseSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const { id } = await params;

    const rx = await prisma.prescription.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, status: true, patientId: true },
    });
    if (!rx) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    if (rx.status !== "active") {
      return NextResponse.json(
        { error: "Only an active prescription can be dispensed" },
        { status: 409 },
      );
    }

    const withStock = parsed.data.lines.filter((l) => l.inventoryItemId);
    const items = withStock.length
      ? await prisma.inventoryItem.findMany({
          where: { id: { in: withStock.map((l) => l.inventoryItemId as string) }, organizationId: orgId },
          select: { id: true, name: true, category: true, quantity: true, unit: true },
        })
      : [];
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const line of withStock) {
      const item = byId.get(line.inventoryItemId as string);
      if (!item) {
        return NextResponse.json({ error: `Stock item not found: ${line.medicationName}` }, { status: 404 });
      }
      if (item.category !== "medication") {
        return NextResponse.json({ error: `Not a medication: ${item.name}` }, { status: 400 });
      }
      if (item.quantity < line.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.name} (have ${item.quantity}, need ${line.quantity})` },
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const deducted: { name: string; quantity: number; unit: string | null }[] = [];
      for (const line of withStock) {
        const item = byId.get(line.inventoryItemId as string)!;
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: line.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: "usage",
            quantity: -line.quantity,
            reason: `Dispensed Rx ${id} (${line.medicationName})`,
          },
        });
        deducted.push({ name: item.name, quantity: line.quantity, unit: item.unit });
      }
      const updated = await tx.prescription.update({
        where: { id },
        data: { status: "completed", sentToPharmacy: true },
        select: { id: true, status: true, sentToPharmacy: true },
      });
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: authz.userId,
          action: "UPDATE",
          entityType: "Prescription",
          entityId: id,
          afterState: JSON.stringify({ status: "completed", sentToPharmacy: true, deducted }),
        },
      });
      return { updated, deducted };
    });

    return NextResponse.json(result);
  } catch (error) {
    logServerError("Error dispensing prescription", error);
    return NextResponse.json({ error: "Failed to dispense prescription" }, { status: 500 });
  }
}
