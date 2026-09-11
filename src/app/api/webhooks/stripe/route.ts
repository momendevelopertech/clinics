import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { logServerError } from "@/lib/safe-logger";
import { shouldApplyPaymentEvent } from "@/lib/webhooks";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    if (!webhookSecret) {
      logServerError("STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logServerError("Webhook signature verification failed", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle payment intent events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;
        if (!paymentIntentId) {
          logServerError("Checkout session missing payment intent");
          break;
        }
        await handlePaymentSuccess({ id: paymentIntentId } as Stripe.PaymentIntent);
        break;
      }
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case "payment_intent.payment_failed":
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedIntent);
        break;

      case "charge.refunded":
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;

      default:
        logServerError("Unhandled stripe event", undefined, { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logServerError("Webhook error", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const stripePaymentId = paymentIntent.id;

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId },
    include: { invoice: true },
  });

  if (!payment) {
    logServerError("Stripe payment not found for success intent", undefined, { stripePaymentId });
    return;
  }

  // Idempotency: Stripe retries deliveries — a duplicate success event must
  // not credit the invoice a second time.
  if (!shouldApplyPaymentEvent(payment.status, "payment_intent.succeeded")) {
    return;
  }
  const allocation = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "completed" },
    });
    const paid = Number(payment.invoice.amountPaid) + Number(payment.amount);
    const total = Number(payment.invoice.totalAmount);
    const updatedInvoice = await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { amountPaid: paid.toFixed(2), status: paid >= total ? "paid" : "partially_paid" },
    });
    return { updatedPayment, updatedInvoice };
  });

  await createAuditLog({
    organizationId: payment.invoice.organizationId,
    action: "UPDATE",
    entityType: "Payment",
    entityId: payment.id,
    actorType: "webhook",
    actorIdentifier: "payment_intent.succeeded",
    beforeState: JSON.stringify({ status: payment.status }),
    afterState: JSON.stringify({ status: allocation.updatedPayment.status, amount: payment.amount, stripePaymentId }),
  });

  await createAuditLog({
    organizationId: payment.invoice.organizationId,
    action: "UPDATE",
    entityType: "Invoice",
    entityId: payment.invoiceId,
    actorType: "webhook",
    actorIdentifier: "payment_intent.succeeded",
    beforeState: JSON.stringify({ status: payment.invoice.status }),
    afterState: JSON.stringify({ status: allocation.updatedInvoice.status, amountPaid: allocation.updatedInvoice.amountPaid }),
  });

  logServerError("Stripe payment completed", undefined, { paymentId: payment.id, invoiceId: payment.invoiceId });
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const stripePaymentId = paymentIntent.id;

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId },
    include: { invoice: true },
  });

  if (!payment) {
    logServerError("Stripe payment not found for failed intent", undefined, { stripePaymentId });
    return;
  }

  // Idempotency: duplicate failure deliveries must not rewrite audit history.
  if (!shouldApplyPaymentEvent(payment.status, "payment_intent.payment_failed")) {
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "failed" },
  });

  await createAuditLog({
    organizationId: payment.invoice.organizationId,
    action: "UPDATE",
    entityType: "Payment",
    entityId: payment.id,
    actorType: "webhook",
    actorIdentifier: "payment_intent.payment_failed",
    beforeState: JSON.stringify({ status: payment.status }),
    afterState: JSON.stringify({ status: "failed", stripePaymentId }),
  });

  logServerError("Stripe payment failed", undefined, { paymentId: payment.id });
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) {
    logServerError("Refund charge missing payment intent");
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: charge.payment_intent as string },
    include: { invoice: true },
  });

  if (!payment) {
    logServerError("Stripe payment not found for refund", undefined, { paymentIntentId: charge.payment_intent as string });
    return;
  }

  if (payment.status === "refunded") return;
  const refundedAmount = (charge.amount_refunded ?? Math.round(Number(payment.amount) * 100)) / 100;
  const allocation = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({ where: { id: payment.id }, data: { status: "refunded", refundedAmount: refundedAmount.toFixed(2) } });
    const paid = Math.max(0, Number(payment.invoice.amountPaid) - refundedAmount);
    const updatedInvoice = await tx.invoice.update({ where: { id: payment.invoiceId }, data: { amountPaid: paid.toFixed(2), status: paid === 0 ? "sent" : "partially_paid" } });
    return { updatedPayment, updatedInvoice };
  });

  await createAuditLog({
    organizationId: payment.invoice.organizationId,
    action: "UPDATE",
    entityType: "Payment",
    entityId: payment.id,
    actorType: "webhook",
    actorIdentifier: "charge.refunded",
    beforeState: JSON.stringify({ status: payment.status }),
    afterState: JSON.stringify({ status: allocation.updatedPayment.status, refundedAmount }),
  });

  logServerError("Stripe payment refunded", undefined, { paymentId: payment.id });
}
