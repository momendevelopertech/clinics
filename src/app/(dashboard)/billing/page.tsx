"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { NewInvoiceDialog } from "@/components/billing/new-invoice-dialog";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";

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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const { forbidden, guardedFetch } = usePermissionState();

  const loadInvoices = React.useCallback(() => {
    guardedFetch<Array<{
      id: string;
      invoiceNumber: string;
      status: string;
      totalAmount: { toString: () => string };
      amountPaid: { toString: () => string };
      patient?: { firstName: string; lastName: string };
    }>>("/api/billing/invoices")
      .then((data) => { if (data) setInvoices(Array.isArray(data) ? data : []); })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [guardedFetch]);

  React.useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const toAmount = (value: { toString: () => string }) => {
    const parsed = parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const closedStatuses = new Set(["paid", "void"]);
  const collected = invoices.reduce(
    (sum, inv) => sum + toAmount(inv.amountPaid),
    0,
  );
  const outstanding = invoices
    .filter((inv) => !closedStatuses.has(inv.status))
    .reduce(
      (sum, inv) =>
        sum + Math.max(0, toAmount(inv.totalAmount) - toAmount(inv.amountPaid)),
      0,
    );
  const openInvoices = invoices.filter((inv) => !closedStatuses.has(inv.status)).length;

  if (forbidden) {
    return (
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight">{t("billing_title")}</h1>
        <PermissionDenied
          title={t("billing_forbiddenTitle") ?? "You don't have permission"}
          description={t("billing_forbidden") ?? "Only staff with billing access can view invoices."}
        />
      </div>
    );
  }

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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(query) ||
      (inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}`.toLowerCase().includes(query) : false);
    return matchesStatus && matchesSearch;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedInvoices = paginate(filteredInvoices, visiblePage, PAGE_SIZE);

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <UpgradePrompt moduleKey="billing" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("billing_title")}</h1>
        <NewInvoiceDialog onSuccess={loadInvoices} />
      </div>

      <FeatureTip tipId="billing-summary">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">{t("billing_totalCollected")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold">${collected.toLocaleString()}</span>
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
              <span className="text-2xl font-bold">${outstanding.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">{t("billing_openInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{openInvoices}</span>
          </CardContent>
        </Card>
      </div>
      </FeatureTip>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("billing_invoices")}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Input
              type="search"
              placeholder={t("billing_search")}
              className="w-full sm:max-w-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("billing_filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common_all")}</SelectItem>
                {Object.keys(statusLabel).map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabel[status] ?? status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                  {pagedInvoices.map((inv) => (
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
          {filteredInvoices.length > PAGE_SIZE ? (
            <DataPagination
              page={visiblePage}
              pageSize={PAGE_SIZE}
              total={filteredInvoices.length}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
