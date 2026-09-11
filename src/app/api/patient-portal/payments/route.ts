import { NextResponse } from "next/server";
import { z } from "zod";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { createAuditLog } from "@/lib/audit";
import stripe from "@/lib/stripe";

const paySchema = z.object({
  invoiceId: z.string().min(1),
});

/**
 * Patient online payment via Stripe Checkout (no client SDK needed):
 * creates a Checkout Session for the invoice's outstanding balance and
 * returns its URL — the portal redirects there, Stripe hosts the card form,
 * and `checkout.session.completed` completes the payment server-side.
 * The amount is always server-computed — the client cannot set or tamper it.
 */
export async function POST(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = paySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: parsed.data.invoiceId,
        patientId: session.patient.id,
        organizationId: session.patient.organizationId,
      },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (outstanding <= 0) {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    let checkoutSession;
    try {
      const origin = new URL(request.url).origin;
      checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: (invoice.currency || "usd").toLowerCase(),
              product_data: { name: `Invoice ${invoice.invoiceNumber}` },
              unit_amount: Math.round(outstanding * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/patient-portal?paid=1`,
        cancel_url: `${origin}/patient-portal?cancelled=1`,
        metadata: {
          invoiceId: invoice.id,
          organizationId: session.patient.organizationId,
          patientId: session.patient.id,
        },
      });
    } catch (error) {
      logServerError("Stripe checkout session creation failed", error);
      return NextResponse.json({ error: "Online payment is not available" }, { status: 503 });
    }

    const stripePaymentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : "";
    if (!stripePaymentId) {
      logServerError("Checkout session missing payment intent");
      return NextResponse.json({ error: "Online payment is not available" }, { status: 503 });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: outstanding.toFixed(2),
        paymentMethod: "card",
        status: "pending",
        stripePaymentId,
      },
      select: { id: true },
    });

    await createAuditLog({
      organizationId: session.patient.organizationId,
      action: "CREATE",
      entityType: "Payment",
      entityId: payment.id,
      actorType: "patient",
      actorIdentifier: session.patient.id,
      afterState: JSON.stringify({ invoiceId: invoice.id, amount: outstanding }),
    });

    return NextResponse.json(
      { paymentId: payment.id, url: checkoutSession.url },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Patient online payment error", error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
