import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";

/** Patient-scoped invoice list with balances — only the patient's own bills. */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { patientId: session.patient.id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        amountPaid: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalAmount: Number(inv.totalAmount),
        amountPaid: Number(inv.amountPaid),
        balance: Number(inv.totalAmount) - Number(inv.amountPaid),
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logServerError("Patient portal invoices error", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
