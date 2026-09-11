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
import { InstallmentPlansDialog } from "@/components/billing/installment-plans-dialog";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

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
  const [expenses, setExpenses] = React.useState<Array<{
    id: string;
    category: string;
    amount: number | string;
    spentAt: string;
    notes: string | null;
  }>>([]);
  const [expForm, setExpForm] = React.useState({ category: "rent", amount: "", date: "", notes: "" });

  const loadExpenses = React.useCallback(() => {
    guardedFetch<{ expenses: Array<{ id: string; category: string; amount: number | string; spentAt: string; notes: string | null }>; total: number }>("/api/expenses")
      .then((data) => { if (data) setExpenses(data.expenses); })
      .catch((error) => logClientError("Expenses fetch failed", error));
  }, [guardedFetch]);

  React.useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const expTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleAddExpense = async () => {
    const amount = Number(expForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("exp_amount"));
      return;
    }
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expForm.category,
          amount,
          spentAt: expForm.date ? new Date(expForm.date).toISOString() : undefined,
          notes: expForm.notes || undefined,
        }),
      });
      if (!response.ok) throw new Error("create failed");
      setExpForm({ category: "rent", amount: "", date: "", notes: "" });
      loadExpenses();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Expense create failed", error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      loadExpenses();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Expense delete failed", error);
    }
  };

  const expCatLabel = (c: string) => t(`exp_cat_${c}`) === `exp_cat_${c}` ? c : t(`exp_cat_${c}`);

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
                    <th className="px-4 py-3 text-left font-medium">{t("common_actions")}</th>
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
                      <td className="px-4 py-3">
                        {!closedStatuses.has(inv.status) ? (
                          <InstallmentPlansDialog invoiceId={inv.id} onSuccess={loadInvoices} />
                        ) : null}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t("exp_title")}
            <span className="text-sm font-normal text-neutral-500">
              {t("exp_total")}: ${expTotal.toFixed(2)}
            </span>
          </CardTitle>
          <p className="text-sm text-neutral-500">{t("exp_subtitle")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="gap-2 flex flex-col">
              <Label>{t("exp_category")}</Label>
              <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["rent", "salaries", "supplies", "utilities", "marketing", "other"].map((c) => (
                    <SelectItem key={c} value={c}>{expCatLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gap-2 flex flex-col">
              <Label>{t("exp_amount")}</Label>
              <Input type="number" min="0.01" step="0.01" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
            </div>
            <div className="gap-2 flex flex-col">
              <Label>{t("exp_date")}</Label>
              <Input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
            </div>
            <div className="gap-2 flex flex-col">
              <Label>{t("exp_notes")}</Label>
              <Input value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddExpense}>{t("exp_add")}</Button>
            </div>
          </div>
          {expenses.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("exp_empty")}</p>
          ) : (
            <div className="rounded-[5px] border overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {expenses.slice(0, 20).map((e) => (
                    <tr key={e.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2">{expCatLabel(e.category)}</td>
                      <td className="px-4 py-2 font-medium">${Number(e.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-neutral-500">{new Date(e.spentAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-neutral-500">{e.notes ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteExpense(e.id)}>
                          {t("exp_delete")}
                        </Button>
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
