import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { logServerError } from "@/lib/safe-logger";

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
        console.log(`Unhandled event type: ${event.type}`);
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
    console.warn(`Payment not found for intent: ${stripePaymentId}`);
    return;
  }

  if (payment.status === "completed") return;
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

  console.log(
    `Payment ${payment.id} completed for invoice ${payment.invoiceId}`,
  );
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const stripePaymentId = paymentIntent.id;

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId },
    include: { invoice: true },
  });

  if (!payment) {
    console.warn(`Payment not found for intent: ${stripePaymentId}`);
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

  console.log(`Payment ${payment.id} failed`);
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) {
    console.warn("Refund charge has no payment intent");
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: charge.payment_intent as string },
    include: { invoice: true },
  });

  if (!payment) {
    console.warn(
      `Payment not found for refunded intent: ${charge.payment_intent}`,
    );
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

  console.log(`Payment ${payment.id} refunded`);
}
