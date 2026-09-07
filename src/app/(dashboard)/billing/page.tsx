"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { DollarSign, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale/locale-provider";

export default function BillingPage() {
  const { t } = useLocale();
  const [invoices, setInvoices] = React.useState<Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: { toString: () => string };
    amountPaid: { toString: () => string };
    patient?: { firstName: string; lastName: string };
  }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/billing/invoices")
      .then((r) => r.json())
      .then((data) => { setInvoices(Array.isArray(data) ? data : []); })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    partially_paid: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  };

  const statusLabel: Record<string, string> = {
    draft: t("billing_statusDraft"),
    sent: t("billing_statusSent"),
    partially_paid: t("billing_statusPartiallyPaid"),
    paid: t("billing_statusPaid"),
    overdue: t("billing_statusOverdue"),
    void: t("billing_statusVoid"),
  };

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("billing_title")}</h1>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          {t("billing_newInvoice")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">{t("billing_totalRevenueMtd")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold">$0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">{t("billing_outstanding")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">$0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">{t("billing_claimsPending")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">0</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("billing_invoices")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-neutral-500">{t("common_loading")}</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 border rounded-[5px]">
              {t("billing_empty")}
            </div>
          ) : (
            <div className="rounded-[5px] border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("billing_colInvoice")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing_colPatient")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing_colTotal")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing_colStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-mono">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        {inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : "—"}
                      </td>
                      <td className="px-4 py-3">${inv.totalAmount?.toString?.() ?? "0"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-[5px] text-xs font-medium ${statusColor[inv.status] ?? "bg-neutral-100"}`}>
                          {statusLabel[inv.status] ?? inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
