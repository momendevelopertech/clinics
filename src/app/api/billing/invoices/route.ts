import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { logServerError } from "@/lib/safe-logger";
import { invoiceCreateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    logServerError("Error fetching invoices", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await getCurrentUserId(orgId);
    const canWriteBilling = await hasPermission(
      userId,
      orgId,
      "billing:write",
      "billing",
    );

    if (!canWriteBilling) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = invoiceCreateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { patientId, dueDate, lineItems, idempotencyKey } = parsed.data;

    if (idempotencyKey) {
      const existing = await prisma.invoice.findUnique({
        where: { idempotencyKey },
        include: { lineItems: true },
      });
      if (existing) return NextResponse.json(existing, { status: 200 });
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const catalogIds = lineItems.flatMap((item) => item.serviceCatalogId ? [item.serviceCatalogId] : []);
    const catalogItems = await prisma.serviceCatalog.findMany({ where: { organizationId: orgId, active: true, id: { in: [...new Set(catalogIds)] } } });
    if (catalogItems.length !== new Set(catalogIds).size) return NextResponse.json({ error: "One or more catalog items are invalid" }, { status: 400 });
    let totalAmount = 0;
    const validLineItems = lineItems.map((li) => {
      const catalog = catalogItems.find((item) => item.id === li.serviceCatalogId);
      const qty = li.quantity;
      const price = catalog ? Number(catalog.price) : (li.unitPrice ?? 0);
      const subtotal = qty * price;
      const amount = Math.max(0, subtotal - li.discountAmount + li.taxAmount);
      totalAmount += amount;
      return { serviceCatalogId: li.serviceCatalogId ?? null, description: li.description || catalog?.name || "Line item", quantity: qty, unitPrice: price.toFixed(2), discountAmount: li.discountAmount.toFixed(2), taxAmount: li.taxAmount.toFixed(2), amount: amount.toFixed(2), cptCode: li.cptCode ?? null };
    });

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const invoice = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: orgId,
          patientId,
          invoiceNumber,
          totalAmount: totalAmount.toString(),
          amountPaid: "0",
          status: "draft",
          dueDate: dueDate ? new Date(dueDate) : null,
          idempotencyKey: idempotencyKey || null,
        },
      });

      for (const li of validLineItems) {
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: inv.id,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            amount: li.amount,
            cptCode: li.cptCode,
            serviceCatalogId: li.serviceCatalogId,
            discountAmount: li.discountAmount,
            taxAmount: li.taxAmount,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "Invoice",
          entityId: inv.id,
          afterState: JSON.stringify({ invoiceNumber, totalAmount }),
        },
      });

      return inv;
      },
    );

    const withItems = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { lineItems: true, patient: true },
    });

    return NextResponse.json(withItems, { status: 201 });
  } catch (error) {
    logServerError("Error creating invoice", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 },
    );
  }
}
