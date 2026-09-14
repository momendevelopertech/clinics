import type { Prisma } from "@prisma/client";

/**
 * G7: Auto-invoice on visit close.
 * When an encounter completes, the system (not the doctor — no billing:write
 * needed, same as the booking-deposit invoice) creates ONE invoice:
 *   - consultation line (provider fee, encounter-linked)
 *   - billable procedure lines (service-catalog prices, encounter-linked)
 *   - 0-amount info lines for dispensed medications (traceability; meds have
 *     no price data in stock — biller prices them)
 * Idempotent via idempotencyKey `encounter-<id>`. Never throws — callers must
 * never fail an encounter close because billing failed.
 */
export async function createAutoInvoiceForEncounter(
  tx: Prisma.TransactionClient,
  opts: { organizationId: string; userId: string; encounterId: string },
): Promise<{ id: string; invoiceNumber: string; totalAmount: string } | null> {
  const { organizationId, userId, encounterId } = opts;
  try {
    const key = `encounter-${encounterId}`;
    const existing = await tx.invoice.findUnique({ where: { idempotencyKey: key }, select: { id: true } });
    if (existing) return null;

    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, organizationId },
      include: {
        appointment: { include: { provider: { select: { id: true, name: true, consultationFee: true } } } },
        prescriptions: { select: { id: true, medicationName: true, status: true, sentToPharmacy: true } },
      },
    });
    if (!encounter) return null;

    type Line = {
      description: string;
      quantity: number;
      unitPrice: string;
      amount: string;
      serviceCatalogId: string | null;
      encounterId: string | null;
    };
    const lines: Line[] = [];
    let total = 0;

    // 1. Consultation (always — even 0, so the biller sees every visit).
    const fee = encounter.appointment?.provider?.consultationFee;
    const feeNum = fee != null ? Number(fee) : 0;
    const providerName = encounter.appointment?.provider?.name ?? "Consultation";
    lines.push({
      description: `Consultation — ${providerName}`,
      quantity: 1,
      unitPrice: feeNum.toFixed(2),
      amount: feeNum.toFixed(2),
      serviceCatalogId: null,
      encounterId,
    });
    total += feeNum;

    // 2. Billable procedures linked to this encounter.
    const procedures = await tx.procedureOrder.findMany({
      where: { encounterId, organizationId },
      include: { serviceCatalog: { select: { id: true, name: true, price: true } } },
    });
    for (const p of procedures) {
      if (p.serviceCatalog) {
        const price = Number(p.serviceCatalog.price);
        lines.push({
          description: p.procedureName || p.serviceCatalog.name,
          quantity: 1,
          unitPrice: price.toFixed(2),
          amount: price.toFixed(2),
          serviceCatalogId: p.serviceCatalog.id,
          encounterId,
        });
        total += price;
      }
    }

    // 3. Dispensed-medication info lines (0 amount — priced by biller).
    const dispensedRxIds = encounter.prescriptions.filter((r) => r.status === "completed").map((r) => r.id);
    if (dispensedRxIds.length > 0) {
      const txns = await tx.inventoryTransaction.findMany({
        where: { item: { organizationId } },
        select: { quantity: true, reason: true, item: { select: { name: true, unit: true } } },
      });
      const byItem = new Map<string, { name: string; qty: number; unit: string | null }>();
      for (const txn of txns) {
        if (!txn.reason || !dispensedRxIds.some((id) => txn.reason!.includes(id))) continue;
        const cur = byItem.get(txn.item.name) ?? { name: txn.item.name, qty: 0, unit: txn.item.unit };
        cur.qty += Math.abs(txn.quantity);
        byItem.set(txn.item.name, cur);
      }
      for (const d of byItem.values()) {
        lines.push({
          description: `Dispensed: ${d.name} x${d.qty}`,
          quantity: d.qty,
          unitPrice: "0.00",
          amount: "0.00",
          serviceCatalogId: null,
          encounterId,
        });
      }
      // Rx completed but dispensed elsewhere (no stock deduction).
      const external = encounter.prescriptions.filter(
        (r) => r.status === "completed" && !r.sentToPharmacy,
      );
      for (const r of external) {
        lines.push({
          description: `Prescribed (external): ${r.medicationName}`,
          quantity: 1,
          unitPrice: "0.00",
          amount: "0.00",
          serviceCatalogId: null,
          encounterId,
        });
      }
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const inv = await tx.invoice.create({
      data: {
        organizationId,
        patientId: encounter.patientId,
        invoiceNumber,
        totalAmount: total.toFixed(2),
        amountPaid: "0",
        status: "sent",
        idempotencyKey: key,
        orderDiscount: "0.00",
      },
    });
    for (const l of lines) {
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: inv.id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: "0.00",
          taxAmount: "0.00",
          amount: l.amount,
          serviceCatalogId: l.serviceCatalogId,
          encounterId: l.encounterId,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "CREATE",
        entityType: "Invoice",
        entityId: inv.id,
        afterState: JSON.stringify({ invoiceNumber, totalAmount: total.toFixed(2), auto: true, encounterId }),
      },
    });
    return { id: inv.id, invoiceNumber, totalAmount: total.toFixed(2) };
  } catch {
    return null;
  }
}
