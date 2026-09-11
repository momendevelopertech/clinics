import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { installmentPlanCreateSchema } from "@/lib/validations";
import { buildInstallmentSchedule } from "@/lib/installments";
import { MANUAL_METHODS, resolveInvoiceStatus } from "@/lib/payments";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:read", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const status = searchParams.get("status");

    const plans = await prisma.installmentPlan.findMany({
      where: {
        organizationId: orgId,
        ...(invoiceId ? { invoiceId } : {}),
        ...(status ? { status } : {}),
      },
      include: { installments: { orderBy: { dueDate: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(plans);
  } catch (error) {
    logServerError("Error fetching installment plans", error);
    return NextResponse.json({ error: "Failed to fetch installment plans" }, { status: 500 });
  }
}

/**
 * POST /api/installment-plans { invoiceId, count, firstDueDate, frequency,
 *   downPayment?, method?, notes? }
 * Splits the invoice's outstanding balance into equal dues. An optional down
 * payment settles immediately as a record-only payment (Stripe-intent methods
 * are rejected here — installments are counter/transfer flows).
 */
export async function POST(request: Request) {
  try {
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

    const parsed = installmentPlanCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { invoiceId, count, firstDueDate, frequency, downPayment, method, notes } = parsed.data;
    if (!MANUAL_METHODS.has(method)) {
      return NextResponse.json(
        { error: "Installments support counter methods only (cash/transfer/check/insurance)" },
        { status: 400 },
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (["paid", "draft"].includes(invoice.status)) {
      return NextResponse.json(
        { error: "Only sent or partially paid invoices can be split" },
        { status: 400 },
      );
    }
    const activePlan = await prisma.installmentPlan.findFirst({
      where: { invoiceId, organizationId: orgId, status: "active" },
    });
    if (activePlan) {
      return NextResponse.json({ error: "Invoice already has an active plan" }, { status: 409 });
    }

    const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (downPayment > outstanding + 0.005) {
      return NextResponse.json({ error: "Down payment exceeds invoice balance" }, { status: 400 });
    }
    const schedule = buildInstallmentSchedule({
      total: Math.round((outstanding - downPayment) * 100) / 100,
      count,
      firstDueDate: new Date(firstDueDate),
      frequency,
    });

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let paid = Number(invoice.amountPaid);
      let downPaymentId: string | null = null;
      if (downPayment > 0) {
        const dp = await tx.payment.create({
          data: { invoiceId, amount: downPayment, paymentMethod: method, status: "completed" },
        });
        downPaymentId = dp.id;
        paid += downPayment;
      }
      const plan = await tx.installmentPlan.create({
        data: {
          organizationId: orgId,
          invoiceId,
          patientId: invoice.patientId,
          totalAmount: outstanding.toFixed(2),
          downPayment: downPayment.toFixed(2),
          status: "active",
          notes: notes || null,
        },
      });
      for (const due of schedule) {
        await tx.installment.create({
          data: {
            planId: plan.id,
            dueDate: due.dueDate,
            amount: due.amount.toFixed(2),
            status: "pending",
          },
        });
      }
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: paid.toFixed(2),
          status: resolveInvoiceStatus(Number(invoice.totalAmount), paid),
        },
      });
      return { plan, downPaymentId };
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "InstallmentPlan",
      entityId: created.plan.id,
      afterState: JSON.stringify({ invoiceId, count, downPayment }),
    });

    const full = await prisma.installmentPlan.findUnique({
      where: { id: created.plan.id },
      include: { installments: { orderBy: { dueDate: "asc" } } },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    logServerError("Error creating installment plan", error);
    return NextResponse.json({ error: "Failed to create installment plan" }, { status: 500 });
  }
}
