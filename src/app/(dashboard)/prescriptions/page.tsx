"use client";

import * as React from "react";
import Link from "next/link";
import {
  ClipboardList,
  Filter as FilterIcon,
  Pill,
  Printer,
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
import { NewPrescriptionDialog } from "@/components/prescriptions/new-prescription-dialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";

interface PrescriptionRow {
  id: string;
  patientId: string;
  patient: { firstName: string; lastName: string };
  prescriber: { name: string } | null;
  medicationName: string;
  status: string;
  sentToPharmacy: boolean;
  createdAt: string;
  items: { id: string }[];
}

export default function PrescriptionsPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const { forbidden, setForbidden } = usePermissionState();

  const fetchPrescriptions = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/prescriptions");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch prescriptions");
      const data = await response.json();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(t("rx_loadError"));
      logClientError("Prescriptions fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [setForbidden, t]);

  React.useEffect(() => {
    void fetchPrescriptions();
  }, [fetchPrescriptions]);

  const filtered = prescriptions.filter((rx) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      `${rx.patient.firstName} ${rx.patient.lastName}`.toLowerCase().includes(query) ||
      rx.medicationName.toLowerCase().includes(query);
    const matchesStatus = !statusFilter || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const paged = paginate(filtered, visiblePage, PAGE_SIZE);

  const statusLabel = (status: string) => {
    if (status === "active") return t("rx_statusActive");
    if (status === "completed") return t("rx_statusCompleted");
    if (status === "cancelled") return t("rx_statusCancelled");
    return status;
  };

  const statusChip = (status: string) => {
    const base = "px-2 py-1 rounded text-xs font-medium";
    if (status === "active") return `${base} bg-emerald-100 text-emerald-800`;
    if (status === "completed") return `${base} bg-blue-100 text-blue-800`;
    if (status === "cancelled") return `${base} bg-red-100 text-red-800`;
    return `${base} bg-neutral-100 text-neutral-700`;
  };

  const setStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      toast.success(
        status === "completed" ? t("rx_completeSuccess") : t("rx_cancelSuccess"),
      );
      await fetchPrescriptions();
    } catch (error) {
      toast.error(status === "completed" ? t("rx_completeError") : t("rx_cancelError"));
      logClientError("Prescription status update failed", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("rx_deleteConfirm"))) return;
    try {
      const response = await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete prescription");
      toast.success(t("rx_deleteSuccess"));
      await fetchPrescriptions();
    } catch (error) {
      toast.error(t("rx_deleteError"));
      logClientError("Prescription delete failed", error);
    }
  };

  if (forbidden) {
    return (
      <div className="flex w-full h-full flex-col gap-6">
        <h2 className="mb-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {t("rx_title")}
        </h2>
        <PermissionDenied
          title={t("rx_forbiddenTitle") ?? "You don't have permission"}
          description={t("rx_forbidden") ?? "Only clinical roles can manage prescriptions."}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            <ClipboardList className="mr-2 inline h-6 w-6" />
            {t("rx_title")}
          </h2>
          <p className="text-sm text-neutral-500">{t("rx_subtitle")}</p>
        </div>
        <NewPrescriptionDialog onSuccess={fetchPrescriptions} />
      </div>

      <div className="flex flex-1 flex-col border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col items-start justify-between gap-4 border-b px-6 py-4 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder={t("rx_search")}
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4" /> {t("common_status")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>{t("rx_filterStatus")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={!statusFilter}
                onCheckedChange={() => setStatusFilter(null)}
              >
                {t("common_all")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "active"}
                onCheckedChange={() =>
                  setStatusFilter(statusFilter === "active" ? null : "active")
                }
              >
                {t("rx_statusActive")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "completed"}
                onCheckedChange={() =>
                  setStatusFilter(statusFilter === "completed" ? null : "completed")
                }
              >
                {t("rx_statusCompleted")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "cancelled"}
                onCheckedChange={() =>
                  setStatusFilter(statusFilter === "cancelled" ? null : "cancelled")
                }
              >
                {t("rx_statusCancelled")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-neutral-500">{t("common_loading")}</p>
            </div>
          ) : paged.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Pill className="mb-4 h-12 w-12 text-neutral-300" />
              <p className="text-neutral-600">{t("rx_empty")}</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 font-medium text-neutral-500 dark:bg-neutral-800/50">
                <tr>
                  <th className="border-b px-6 py-4">{t("rx_colPatient")}</th>
                  <th className="border-b px-6 py-4">{t("rx_colMedication")}</th>
                  <th className="hidden border-b px-6 py-4 md:table-cell">
                    {t("rx_colPrescriber")}
                  </th>
                  <th className="border-b px-6 py-4">{t("common_status")}</th>
                  <th className="hidden border-b px-6 py-4 lg:table-cell">
                    {t("rx_colDate")}
                  </th>
                  <th className="border-b px-6 py-4">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                {paged.map((rx) => (
                  <tr key={rx.id} className="transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/patients/${rx.patientId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {rx.patient.firstName} {rx.patient.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{rx.medicationName}</p>
                      {rx.items.length > 0 ? (
                        <p className="text-xs text-neutral-500">
                          +{rx.items.length} {t("rx_moreItems")}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell">
                      {rx.prescriber?.name ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={statusChip(rx.status)}>
                          {statusLabel(rx.status)}
                        </span>
                        {rx.sentToPharmacy ? (
                          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {t("rx_sentToPharmacy")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/print/prescription/${rx.id}`}>
                            <Printer className="h-4 w-4" /> {t("rx_print")}
                          </Link>
                        </Button>
                        {rx.status === "active" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void setStatus(rx.id, "completed")}
                            >
                              {t("rx_complete")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => void setStatus(rx.id, "cancelled")}
                            >
                              {t("rx_cancel")}
                            </Button>
                          </>
                        ) : rx.status === "cancelled" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => void handleDelete(rx.id)}
                          >
                            {t("common_delete")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > PAGE_SIZE ? (
          <DataPagination
            page={visiblePage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}