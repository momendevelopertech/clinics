"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  ClipboardList,
  Filter as FilterIcon,
  Pill,
  Printer,
  Trash2,
  X,
} from "lucide-react";;
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
import { DispenseDialog } from "@/components/prescriptions/dispense-dialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PrescriptionRow {
  id: string;
  patientId: string;
  patient: { firstName: string; lastName: string };
  prescriber: { name: string } | null;
  medicationName: string;
  status: string;
  sentToPharmacy: boolean;
  createdAt: string;
  items: { id: string; medicationName?: string; dosage?: string | null }[];
}

export default function PrescriptionsPage() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const { forbidden, setForbidden } = usePermissionState();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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
    const base = "px-2.5 py-0.5 rounded-md text-xs font-semibold inline-flex items-center";
    if (status === "active") return `${base} bg-success-bg text-success-text border border-success/30`;
    if (status === "completed") return `${base} bg-primary/10 text-primary border border-primary/25`;
    if (status === "cancelled") return `${base} bg-critical-bg text-critical-text border border-critical/30`;
    return `${base} bg-muted text-muted-foreground border border-border`;
  };

  const setStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      triggerGuidance("prescription_created",
        status === "completed" ? t("rx_completeSuccess") : t("rx_cancelSuccess"),
      );
      await fetchPrescriptions();
    } catch (error) {
      toast.error(status === "completed" ? t("rx_completeError") : t("rx_cancelError"));
      logClientError("Prescription status update failed", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || deleting) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/prescriptions/${deleteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete prescription");
      triggerGuidance("action_completed", t("rx_deleteSuccess"));
      setDeleteId(null);
      await fetchPrescriptions();
    } catch (error) {
      toast.error(t("rx_deleteError"));
      logClientError("Prescription delete failed", error);
    } finally {
      setDeleting(false);
    }
  };

  if (forbidden) {
    return (
      <div className="flex w-full h-full flex-col gap-6">
        <h2 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
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
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-foreground flex items-center">
            <ClipboardList className="mr-2 inline h-6 w-6 text-primary" />
            {t("rx_title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("rx_subtitle")}</p>
        </div>
        <NewPrescriptionDialog onSuccess={fetchPrescriptions} />
      </div>

      <div className="flex flex-1 flex-col rounded-lg border border-border bg-card shadow-xs">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-border px-6 py-4 bg-muted-bg sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder={t("rx_search")}
            className="w-full sm:max-w-sm h-9"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
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
              <p className="text-muted-foreground">{t("common_loading")}</p>
            </div>
          ) : paged.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <Pill className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("rx_empty")}</p>
              <NewPrescriptionDialog onSuccess={fetchPrescriptions} />
            </div>
          ) : (
            <table className="w-full text-start text-sm">
              <thead className="bg-muted-bg font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="border-b border-border px-6 py-3.5">{t("rx_colPatient")}</th>
                  <th className="border-b border-border px-6 py-3.5">{t("rx_colMedication")}</th>
                  <th className="hidden border-b border-border px-6 py-3.5 md:table-cell">
                    {t("rx_colPrescriber")}
                  </th>
                  <th className="border-b border-border px-6 py-3.5">{t("common_status")}</th>
                  <th className="hidden border-b border-border px-6 py-3.5 lg:table-cell">
                    {t("rx_colDate")}
                  </th>
                  <th className="border-b border-border px-6 py-3.5">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {paged.map((rx) => (
                  <tr key={rx.id} className="transition-colors hover:bg-muted-bg/60">
                    <td className="px-6 py-4">
                      <Link
                        href={`/patients/${rx.patientId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {rx.patient.firstName} {rx.patient.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{rx.medicationName}</p>
                      {rx.items.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          +{rx.items.length} {t("rx_moreItems")}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell text-muted-foreground">
                      {rx.prescriber?.name ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={statusChip(rx.status)}>
                          {statusLabel(rx.status)}
                        </span>
                        {rx.sentToPharmacy ? (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
                            {t("rx_sentToPharmacy")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell text-muted-foreground">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" className="h-8" asChild>
                          <Link href={`/print/prescription/${rx.id}`}>
                            <Printer className="mr-1.5 h-4 w-4" /> {t("rx_print")}
                          </Link>
                        </Button>
                        {rx.status === "active" ? (
                          <>
                            <DispenseDialog
                              prescriptionId={rx.id}
                              lines={[
                                { medicationName: rx.medicationName },
                                ...rx.items
                                  .filter((it) => it.medicationName)
                                  .map((it) => ({ medicationName: it.medicationName as string, dosage: it.dosage })),
                              ]}
                              patientLabel={`${rx.patient.firstName} ${rx.patient.lastName}`}
                              onDone={() => void fetchPrescriptions()}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => void setStatus(rx.id, "completed")}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />{t("rx_complete")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-destructive hover:text-destructive"
                              onClick={() => void setStatus(rx.id, "cancelled")}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />{t("rx_cancel")}
                            </Button>
                          </>
                        ) : rx.status === "cancelled" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(rx.id)}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />{t("common_delete")}
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
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteId(null) }}
        title={t("common_confirmTitle")}
        description={t("rx_deleteConfirm")}
        onConfirm={handleDelete}
        destructive
        loading={deleting}
      />
    </div>
  );
}
