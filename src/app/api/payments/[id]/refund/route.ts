import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import stripe from "@/lib/stripe";
import { logServerError } from "@/lib/safe-logger";
import { paymentRefundSchema } from "@/lib/validations";
import { resolveInvoiceStatus } from "@/lib/payments";

/**
 * POST /api/payments/[id]/refund { amount? }
 * Staff-initiated refund. Card/online payments go through Stripe
 * (full or partial); record-only methods (cash/transfer/check/insurance)
 * are reversed locally. Idempotent: refunding an already-refunded payment
 * returns its current state. Invoice money is decremented in the same
 * transaction that marks the payment.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "payments");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "payments");
    if (!planAuthz.ok) return planAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = paymentRefundSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.findFirst({
      where: { id, invoice: { organizationId: orgId } },
      include: { invoice: true },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (payment.status === "refunded") {
      return NextResponse.json({
        id: payment.id,
        status: payment.status,
        refundedAmount: payment.refundedAmount,
        alreadyRefunded: true,
      });
    }
    if (payment.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed payments can be refunded" },
        { status: 400 },
      );
    }

    const maxRefundable = Number(payment.amount) - Number(payment.refundedAmount);
    const refundAmount = parsed.data.amount ?? maxRefundable;
    if (!(refundAmount > 0) || refundAmount > maxRefundable + 0.005) {
      return NextResponse.json(
        { error: "Refund amount exceeds refundable balance" },
        { status: 400 },
      );
    }

    // Card/online money moves through Stripe; manual methods reverse locally.
    if (payment.stripePaymentId) {
      try {
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentId,
          amount: Math.round(refundAmount * 100),
        });
      } catch (stripeError) {
        logServerError("Stripe refund failed", stripeError);
        return NextResponse.json(
          { error: "Refund rejected by payment provider" },
          { status: 502 },
        );
      }
    }

    const fullyRefunded = refundAmount >= maxRefundable - 0.005;
    const settled = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: (Number(payment.refundedAmount) + refundAmount).toFixed(2),
          status: fullyRefunded ? "refunded" : "completed",
        },
      });
      const paid = Math.max(0, Number(payment.invoice.amountPaid) - refundAmount);
      const updatedInvoice = await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: paid.toFixed(2),
          status: resolveInvoiceStatus(Number(payment.invoice.totalAmount), paid),
        },
      });
      return { updatedPayment, updatedInvoice };
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Payment",
      entityId: payment.id,
      beforeState: JSON.stringify({ status: payment.status, refundedAmount: payment.refundedAmount }),
      afterState: JSON.stringify({
        status: settled.updatedPayment.status,
        refundedAmount: settled.updatedPayment.refundedAmount,
        refundAmount,
      }),
    });

    return NextResponse.json({
      id: settled.updatedPayment.id,
      status: settled.updatedPayment.status,
      refundedAmount: settled.updatedPayment.refundedAmount,
    });
  } catch (error) {
    logServerError("Error refunding payment", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
