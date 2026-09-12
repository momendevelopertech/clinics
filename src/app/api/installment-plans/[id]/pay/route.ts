import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { installmentPaySchema } from "@/lib/validations";
import { MANUAL_METHODS, resolveInvoiceStatus } from "@/lib/payments";

/**
 * POST /api/installment-plans/[id]/pay { installmentId, method? }
 * Settles one due as a record-only payment (counter/transfer flow): creates
 * the Payment, credits the invoice, marks the due paid, and completes the
 * plan when nothing is left pending. One transaction — money never half-moves.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: planId } = await params;
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "billing");
    if (!planAuthz.ok) return planAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = installmentPaySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (!MANUAL_METHODS.has(parsed.data.method)) {
      return NextResponse.json(
        { error: "Installment dues accept counter methods only" },
        { status: 400 },
      );
    }

    const plan = await prisma.installmentPlan.findFirst({
      where: { id: planId, organizationId: orgId },
      include: { invoice: true, installments: true },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (plan.status !== "active") {
      return NextResponse.json({ error: "Plan is not active" }, { status: 400 });
    }
    const due = plan.installments.find((d) => d.id === parsed.data.installmentId);
    if (!due) return NextResponse.json({ error: "Installment not found" }, { status: 404 });
    if (due.status === "paid") {
      return NextResponse.json({ error: "Installment already paid", alreadyPaid: true }, { status: 200 });
    }
    if (due.status !== "pending" && due.status !== "overdue") {
      return NextResponse.json({ error: "Installment cannot be paid" }, { status: 400 });
    }

    const settled = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: plan.invoiceId,
          amount: due.amount,
          paymentMethod: parsed.data.method,
          status: "completed",
        },
      });

      // Compare-and-set: only an unpaid due can transition to paid. A
      // concurrent payment of the same due matches 0 rows and aborts the
      // transaction instead of double-crediting the invoice.
      const claimed = await tx.installment.updateMany({
        where: { id: due.id, planId, status: { in: ["pending", "overdue"] } },
        data: { status: "paid", paidAt: new Date(), paymentId: payment.id },
      });
      if (claimed.count !== 1) {
        throw new InstallmentConflictError();
      }

      // Atomic increment avoids a lost update on amountPaid when two dues
      // settle in parallel; status is recomputed from the resulting row.
      const fresh = await tx.invoice.findUniqueOrThrow({ where: { id: plan.invoiceId } });
      const paid = Number(fresh.amountPaid) + Number(due.amount);
      await tx.invoice.update({
        where: { id: plan.invoiceId },
        data: {
          amountPaid: { increment: due.amount },
          status: resolveInvoiceStatus(Number(fresh.totalAmount), paid),
        },
      });

      const remaining = await tx.installment.count({
        where: { planId, status: { in: ["pending", "overdue"] } },
      });
      if (remaining === 0) {
        await tx.installmentPlan.update({ where: { id: planId }, data: { status: "completed" } });
      }
      return { payment, remaining };
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Installment",
      entityId: due.id,
      beforeState: JSON.stringify({ status: due.status }),
      afterState: JSON.stringify({ status: "paid", paymentId: settled.payment.id }),
    });

    const full = await prisma.installmentPlan.findUnique({
      where: { id: planId },
      include: { installments: { orderBy: { dueDate: "asc" } } },
    });
    return NextResponse.json(full);
  } catch (error) {
    if (error instanceof InstallmentConflictError) {
      return NextResponse.json(
        { error: "Installment was already paid", alreadyPaid: true },
        { status: 409 },
      );
    }
    logServerError("Error paying installment", error);
    return NextResponse.json({ error: "Failed to pay installment" }, { status: 500 });
  }
}

class InstallmentConflictError extends Error {}
