"use client";

import * as React from "react";
import {
  CreditCard,
  Filter as FilterIcon,
  Download,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { FeatureNotConfiguredBanner } from "@/components/ui/feature-not-configured-banner";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";

interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  amount: number | string;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  refundedAmount?: number | string | null;
  createdAt: string;
}

function toAmount(value: number | string) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PaymentsPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [refundArmed, setRefundArmed] = React.useState<string | null>(null);
  const { forbidden, setForbidden } = usePermissionState();
  const { get } = useFeatureConfig();
  const stripe = get("stripe");

  React.useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/payments");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      toast.error(t("pay_loadError"));
      logClientError("Payments fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      [
        "Invoice Number",
        "Patient Name",
        "Amount",
        "Currency",
        "Status",
        "Date",
      ],
      ...payments.map((p) => [
        p.invoiceNumber,
        p.patientName,
        toAmount(p.amount).toFixed(2),
        p.currency.toUpperCase(),
        p.status,
        new Date(p.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t("pay_exportSuccess"));
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedPayments = paginate(filteredPayments, visiblePage, PAGE_SIZE);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      completed: t("pay_completed"),
      pending: t("pay_pending"),
      failed: t("pay_failed"),
      refunded: t("pay_refunded"),
    };
    return map[status] ?? status;
  };

  const methodLabel = (method?: string | null) => {
    const map: Record<string, string> = {
      card: t("pay_method_card"),
      online: t("pay_method_online"),
      cash: t("pay_method_cash"),
      transfer: t("pay_method_transfer"),
      check: t("pay_method_check"),
      insurance: t("pay_method_insurance"),
    };
    return (method && map[method]) || method || "—";
  };

  const handleRefund = async (payment: Payment) => {
    if (refundArmed !== payment.id) {
      setRefundArmed(payment.id);
      window.setTimeout(() => {
        setRefundArmed((armed) => (armed === payment.id ? null : armed));
      }, 5000);
      return;
    }
    try {
      setRefundArmed(null);
      const response = await fetch(`/api/payments/${payment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Refund failed");
      }
      toast.success(t("pay_refundedSuccess"));
      await fetchPayments();
    } catch (error) {
      toast.error(t("pay_refundError"));
      logClientError("Payment refund failed", error);
    }
  };

  const totalRevenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + toAmount(p.amount), 0);

  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + toAmount(p.amount), 0);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6 w-full h-full">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <CreditCard className="w-6 h-6 inline mr-2" />
            {t("pay_title")}
          </h2>
          <p className="text-sm text-neutral-500">{t("pay_subtitle")}</p>
        </div>
        <PermissionDenied
          title={t("pay_forbiddenTitle") ?? "You don't have permission"}
          description={t("pay_forbidden") ?? "Only staff with billing access can view payments."}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <UpgradePrompt moduleKey="payments" />
      {stripe && !stripe.configured ? (
        <FeatureNotConfiguredBanner feature="stripe" missingEnvVars={stripe.missing} />
      ) : null}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <CreditCard className="w-6 h-6 inline mr-2" />
            {t("pay_title")}
          </h2>
          <p className="text-sm text-neutral-500">
            {t("pay_subtitle")}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border rounded-[5px] p-4 shadow-sm">
          <p className="text-sm text-neutral-500 mb-1">{t("pay_totalRevenue")}</p>
          <p className="text-2xl font-bold text-green-600">
            ${totalRevenue.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">{t("pay_completedPayments")}</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border rounded-[5px] p-4 shadow-sm">
          <p className="text-sm text-neutral-500 mb-1">{t("pay_pendingAmount")}</p>
          <p className="text-2xl font-bold text-yellow-600">
            ${pendingAmount.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">{t("pay_awaitingPayment")}</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border rounded-[5px] p-4 shadow-sm">
          <p className="text-sm text-neutral-500 mb-1">{t("pay_totalTransactions")}</p>
          <p className="text-2xl font-bold text-blue-600">{payments.length}</p>
          <p className="text-xs text-neutral-500 mt-2">{t("pay_allPayments")}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Input
            type="search"
            placeholder={t("pay_search")}
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex gap-2">
            <FeatureTip tipId="payments-status">
              <span className="inline-flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <FilterIcon className="w-4 h-4" /> {t("common_status")}
                    </Button>
                  </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t("pay_filterByStatus")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!statusFilter}
                  onCheckedChange={() => setStatusFilter(null)}
                >
                  {t("common_all")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "completed"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "completed" ? null : "completed",
                    )
                  }
                >
                  {t("pay_completed")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "pending"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "pending" ? null : "pending",
                    )
                  }
                >
                  {t("pay_pending")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "failed"}
                  onCheckedChange={() =>
                    setStatusFilter(statusFilter === "failed" ? null : "failed")
                  }
                >
                  {t("pay_failed")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "refunded"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "refunded" ? null : "refunded",
                    )
                  }
                >
                  {t("pay_refunded")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
              </span>
            </FeatureTip>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> {t("pay_export")}
            </Button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-neutral-500">{t("pay_loading")}</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <DollarSign className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-neutral-600">{t("pay_empty")}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b">{t("pay_colInvoice")}</th>
                  <th className="px-6 py-4 border-b">{t("pay_colPatient")}</th>
                  <th className="px-6 py-4 border-b">{t("pay_colAmount")}</th>
                  <th className="px-6 py-4 border-b">{t("pay_colMethod")}</th>
                  <th className="px-6 py-4 border-b">{t("common_status")}</th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    {t("pay_colDate")}
                  </th>
                  <th className="px-6 py-4 border-b">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                {pagedPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono font-medium text-sm">
                        {payment.invoiceNumber}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{payment.patientName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: payment.currency,
                        }).format(toAmount(payment.amount))}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {methodLabel(payment.paymentMethod)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}
                      >
                        {statusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === "completed" ? (
                        <Button
                          variant="link"
                          size="sm"
                          className={`p-0 h-auto text-sm font-medium ${refundArmed === payment.id ? "text-red-700" : "text-red-600 hover:text-red-700"}`}
                          onClick={() => handleRefund(payment)}
                        >
                          {refundArmed === payment.id
                            ? t("pay_refundConfirm").replace(
                                "{amount}",
                                `${toAmount(payment.amount).toFixed(2)} ${payment.currency.toUpperCase()}`,
                              )
                            : t("pay_refund")}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredPayments.length > PAGE_SIZE ? (
          <DataPagination
            page={visiblePage}
            pageSize={PAGE_SIZE}
            total={filteredPayments.length}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}
