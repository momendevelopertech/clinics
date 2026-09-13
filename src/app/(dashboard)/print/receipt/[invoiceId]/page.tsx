import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { PrintButton } from "@/components/print/print-button";

export default async function ReceiptPrintPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const organizationId = session.user.organizationId;

  const invoice = await prisma.invoice.findFirst({
    where: { id: (await params).invoiceId, organizationId },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      amountPaid: true,
      status: true,
      currency: true,
      createdAt: true,
      patient: {
        select: { firstName: true, lastName: true, mrn: true },
      },
      organization: { select: { name: true, phone: true, address: true } },
      lineItems: {
        select: { description: true, quantity: true, unitPrice: true, amount: true },
      },
      payments: {
        where: { status: "completed" },
        select: { amount: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!invoice) notFound();

  const t = await getDictionary();

  const total = Number(invoice.totalAmount);
  const paid = Number(invoice.amountPaid);
  const balance = Math.max(0, total - paid);
  const currency = invoice.currency || "USD";

  const fmt = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);

  const paymentMethods = [
    ...new Set(invoice.payments.map((payment) => payment.paymentMethod)),
  ].join(", ");

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-[560px]">
        <div className="mb-4 flex items-center justify-between print-hide">
          <Link
            href="/payments"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t["timeline_backToPatients"]}
          </Link>
          <PrintButton />
        </div>

        <div className="print-sheet rounded-lg border border-border bg-card p-8 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-content-center rounded-md bg-primary text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{invoice.organization.name}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.organization.address ?? ""}
                  {invoice.organization.phone ? ` · ${invoice.organization.phone}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                {t["print_receiptTitle"]}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t["print_patient"]}</p>
              <p className="mt-1 font-semibold text-foreground">
                {invoice.patient.firstName} {invoice.patient.lastName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                MRN {invoice.patient.mrn ?? "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t["print_date"]}</p>
              <p className="mt-1 font-medium text-foreground">
                {new Intl.DateTimeFormat().format(invoice.createdAt)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{invoice.status}</p>
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 text-left font-medium">{t["print_item"]}</th>
                <th className="py-2 text-right font-medium">{t["print_qty"]}</th>
                <th className="py-2 text-right font-medium">{t["print_unitPrice"]}</th>
                <th className="py-2 text-right font-medium">{t["print_amount"]}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, index) => (
                <tr key={index} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-foreground">{item.description}</td>
                  <td className="py-2 text-right ltr-on-rtl">{item.quantity}</td>
                  <td className="py-2 text-right ltr-on-rtl">{fmt(Number(item.unitPrice))}</td>
                  <td className="py-2 text-right font-medium text-foreground ltr-on-rtl">
                    {fmt(Number(item.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between font-semibold text-foreground">
              <span>{t["print_total"]}</span>
              <span className="ltr-on-rtl">{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
              <span>{t["print_paid"]}</span>
              <span className="ltr-on-rtl">{fmt(paid)}</span>
            </div>
            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
              <span>{t["print_balance"]}</span>
              <span className="ltr-on-rtl">{fmt(balance)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span>{t["print_paymentMethod"]}: {paymentMethods || "—"}</span>
            <span className="font-medium text-foreground">{fmt(paid)}</span>
          </div>

          <div className="mt-10 flex items-end justify-between gap-4">
            <p className="text-xs text-muted-foreground">{t["print_signature"]}</p>
            <div className="w-40 border-b border-foreground/60 pb-0.5" />
          </div>
        </div>
      </div>
    </main>
  );
}