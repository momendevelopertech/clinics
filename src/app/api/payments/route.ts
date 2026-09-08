import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import stripe from "@/lib/stripe";
import { logServerError } from "@/lib/safe-logger";
import { paymentSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "payments");
    if (moduleAuthz.response) return moduleAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = paymentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { invoiceId, amount, currency, description } = parsed.data;

    // Verify invoice exists and belongs to org
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { patient: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (amount > outstanding + 0.005) return NextResponse.json({ error: "Payment exceeds invoice balance" }, { status: 400 });

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: description || `Invoice ${invoice.invoiceNumber}`,
      metadata: {
        invoiceId,
        organizationId: orgId,
        patientId: invoice.patientId,
      },
    });

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount,
        paymentMethod: "card",
        status: "pending",
        stripePaymentId: paymentIntent.id,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Payment",
      entityId: payment.id,
      afterState: JSON.stringify({
        invoiceId,
        amount,
        status: "pending",
        stripePaymentIntentId: paymentIntent.id,
      }),
    });

    return NextResponse.json(
      {
        id: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount,
        currency,
        status: payment.status,
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating payment intent", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "payments");
    if (moduleAuthz.response) return moduleAuthz.response;
    assertOrgScope(orgId);

    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    const payments = await prisma.payment.findMany({
      where: {
        invoice: { organizationId: orgId },
        ...(invoiceId ? { invoiceId } : {}),
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            currency: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      payments.map((p: Prisma.PaymentGetPayload<{
        include: {
          invoice: {
            select: {
              invoiceNumber: true;
              currency: true;
              patient: { select: { firstName: true; lastName: true } };
            };
          };
        };
      }>) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice.invoiceNumber,
        patientName: `${p.invoice.patient.firstName} ${p.invoice.patient.lastName}`,
        amount: p.amount,
        currency: p.invoice.currency,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    logServerError("Error fetching payments", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}
