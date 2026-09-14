"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { FeatureNotConfiguredBanner } from "@/components/ui/feature-not-configured-banner";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import { NewInvoiceDialog } from "@/components/billing/new-invoice-dialog";
import { CouponsCard } from "@/components/billing/coupons-card";
import { InstallmentPlansDialog } from "@/components/billing/installment-plans-dialog";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { formatMoney } from "@/lib/format-money";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

export default function BillingPageClient() {
  const { t } = useLocale();
  const [invoices, setInvoices] = React.useState<Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: { toString: () => string };
    amountPaid: { toString: () => string };
    currency?: string | null;
    dueDate?: string | null;
    patient?: { firstName: string; lastName: string };
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const { forbidden, guardedFetch } = usePermissionState();
  const { get } = useFeatureConfig();
  const stripe = get("stripe");
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
    if (!window.confirm(t("common_confirmDelete"))) return;
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
      currency?: string | null;
      dueDate?: string | null;
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

  const invoiceCurrency = (inv: { currency?: string | null }) =>
    inv.currency || "USD";

  const isOverdue = (inv: { status: string }) => inv.status === "overdue";

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
      <div className="flex flex-col gap-6 w-full">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("billing_title")}</h1>
        <PermissionDenied
          title={t("billing_forbiddenTitle") ?? "You don't have permission"}
          description={t("billing_forbidden") ?? "Only staff with billing access can view invoices."}
        />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    draft: "bg-muted-bg text-muted-foreground border border-border",
    sent: "bg-primary/10 text-primary border border-primary/20",
    partially_paid: "bg-warning-bg text-warning-text border border-warning/30",
    paid: "bg-success-bg text-success-text border border-success/30",
    overdue: "bg-critical-bg text-critical-text border border-critical/30",
    void: "bg-muted-bg text-muted-foreground border border-border",
  };

  const statusLabel: Record<string, string> = {
    draft: t("billing_statusDraft"),
    sent: t("billing_statusSent"),
    partially_paid: t("billing_statusPartiallyPaid"),
    paid: t("billing_statusPaid"),
    overdue: t("billing_statusOverdue"),
    void: t("billing_statusVoid"),
  };

  const filteredInvoices = invoices
    .filter((inv) => {
      const matchesStatus =
        statusFilter === "all" || inv.status === statusFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(query) ||
        (inv.patient
          ? `${inv.patient.firstName} ${inv.patient.lastName}`
              .toLowerCase()
              .includes(query)
          : false);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)));

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedInvoices = paginate(filteredInvoices, visiblePage, PAGE_SIZE);

  return (
    <motion.div
      className="flex flex-col gap-6 w-full pb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <UpgradePrompt moduleKey="billing" />
      {stripe && !stripe.configured ? (
        <FeatureNotConfiguredBanner feature="stripe" missingEnvVars={stripe.missing} />
      ) : null}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("billing_title")}</h1>
          <p className="text-xs text-muted-foreground">{t("billing_invoices")}</p>
        </div>
        <div className="flex items-center gap-2">
          <NewInvoiceDialog onSuccess={loadInvoices} />
          <PaymentDialog onSuccess={loadInvoices} />
        </div>
      </div>

      <FeatureTip tipId="billing-summary">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-lg border border-border bg-card shadow-2xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">{t("billing_totalCollected")}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-success-bg p-2 text-success-text border border-success/30">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">{formatMoney(collected)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-card shadow-2xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">{t("billing_outstanding")}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-warning-bg p-2 text-warning-text border border-warning/30">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">{formatMoney(outstanding)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-card shadow-2xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">{t("billing_openInvoices")}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-2 text-primary border border-primary/20">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">{openInvoices}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      </FeatureTip>

      <Card className="rounded-lg border border-border bg-card shadow-2xs">
        <CardHeader className="p-5 border-b border-border bg-muted-bg">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              {t("billing_invoices")}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
              <Input
                type="search"
                placeholder={t("billing_search")}
                className="h-9 w-full sm:w-64 bg-card text-xs border-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
              <SearchableSelect
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: t("common_all") },
                  ...Object.keys(statusLabel).map((status) => ({
                    value: status,
                    label: statusLabel[status] ?? status,
                  })),
                ]}
                placeholder={t("billing_filterStatus")}
                triggerClassName="h-9 w-full sm:w-44 bg-card text-xs border-input"
                contentClassName="text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">{t("common_loading")}</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {t("billing_empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-border bg-muted-bg text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("billing_colInvoice")}</th>
                    <th className="px-4 py-3">{t("billing_colPatient")}</th>
                    <th className="px-4 py-3">{t("billing_colTotal")}</th>
                    <th className="px-4 py-3">{t("common_paid")}</th>
                    <th className="px-4 py-3">{t("common_balance")}</th>
                    <th className="px-4 py-3">{t("eq_dueAt")}</th>
                    <th className="px-4 py-3">{t("billing_colStatus")}</th>
                    <th className="px-4 py-3">{t("common_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {pagedInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${
                        isOverdue(inv)
                          ? "bg-critical-bg/50 border-l-4 border-l-destructive hover:bg-critical-bg/80"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-semibold">
                        {inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">{formatMoney(toAmount(inv.totalAmount), invoiceCurrency(inv))}</td>
                      <td className="px-4 py-3 font-mono font-medium">{formatMoney(toAmount(inv.amountPaid), invoiceCurrency(inv))}</td>
                      <td className="px-4 py-3 font-mono font-medium">{formatMoney(Math.max(0, toAmount(inv.totalAmount) - toAmount(inv.amountPaid)), invoiceCurrency(inv))}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor[inv.status] ?? "bg-muted-bg text-muted-foreground border border-border"}`}>
                          {statusLabel[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {!closedStatuses.has(inv.status) ? (
                            <>
                              <PaymentDialog
                                invoiceId={inv.id}
                                onSuccess={loadInvoices}
                                trigger={
                                  <Button className="h-7 px-2.5 text-xs font-semibold shadow-2xs">
                                    {t("common_payNow")}
                                  </Button>
                                }
                              />
                              <InstallmentPlansDialog invoiceId={inv.id} onSuccess={loadInvoices} />
                            </>
                          ) : null}
                          <Link
                            href={`/print/receipt/${inv.id}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {t("common_receipt")}
                          </Link>
                        </div>
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

      <Card className="rounded-lg border border-border bg-card shadow-2xs">
        <CardHeader className="p-5 border-b border-border bg-muted-bg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                {t("exp_title")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t("exp_subtitle")}</p>
            </div>
            <span className="font-mono text-sm font-bold text-foreground">
              {t("exp_total")}: {formatMoney(expTotal)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="gap-1.5 flex flex-col">
              <Label className="text-xs font-semibold">{t("exp_category")}</Label>
              <SearchableSelect value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v })} options={["rent", "salaries", "supplies", "utilities", "marketing", "other"].map((c) => ({ value: c, label: expCatLabel(c) }))} triggerClassName="h-9 text-xs" contentClassName="text-xs" />
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label className="text-xs font-semibold">{t("exp_amount")}</Label>
              <Input type="number" min="0.01" step="0.01" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label className="text-xs font-semibold">{t("exp_date")}</Label>
              <Input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label className="text-xs font-semibold">{t("exp_notes")}</Label>
              <Input value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddExpense} className="h-9 w-full text-xs font-semibold shadow-2xs gap-1.5"><Plus className="w-3.5 h-3.5" />{t("exp_add")}</Button>
            </div>
          </div>
          {expenses.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t("exp_empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-border bg-muted-bg text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">{t("exp_category")}</th>
                    <th className="px-4 py-2.5">{t("exp_amount")}</th>
                    <th className="px-4 py-2.5">{t("exp_date")}</th>
                    <th className="px-4 py-2.5">{t("exp_notes")}</th>
                    <th className="px-4 py-2.5 text-end">{t("common_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {expenses.slice(0, 20).map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5 font-medium">{expCatLabel(e.category)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold">{formatMoney(Number(e.amount))}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{new Date(e.spentAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{e.notes ?? "—"}</td>
                      <td className="px-4 py-2.5 text-end">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExpense(e.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />{t("exp_delete")}
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
      <CouponsCard />
    </motion.div>
  );
}
