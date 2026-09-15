"use client";

import * as React from "react";
import {
  Beaker,
  Download,
  Eye,
  Filter as FilterIcon,
  TrendingUp,
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
import { AddLabResultDialog } from "@/components/labs/add-lab-result-dialog";
import { AddLabOrderDialog } from "@/components/labs/add-lab-order-dialog";
import { LabOrdersSection } from "@/components/labs/lab-orders-section";
import { DataPagination } from "@/components/ui/data-pagination";
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog";
import { paginate } from "@/lib/pagination";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";

interface LabResult {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  resultValue: string | null;
  unit: string | null;
  referenceRange: string | null;
  status: string;
  performedAt: string | null;
  reportUrl: string | null;
  createdAt: string;
}

export default function LabResultsPage() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<LabResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [preview, setPreview] = React.useState<{ title: string; url: string } | null>(null);
  const { forbidden, setForbidden } = usePermissionState();

  const fetchLabResults = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/labs");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch lab results");
      const data = await response.json();
      setResults(data);
    } catch (error) {
      toast.error(t("labs_loadError"));
      logClientError("Lab results fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [setForbidden, t]);

  React.useEffect(() => {
    fetchLabResults();
  }, [fetchLabResults]);

  const handleExport = () => {
    const csv = [
      [
        "Patient Name",
        "Test Name",
        "Result Value",
        "Unit",
        "Reference Range",
        "Status",
        "Performed Date",
      ],
      ...results.map((r) => [
        r.patientName,
        r.testName,
        r.resultValue || "-",
        r.unit || "-",
        r.referenceRange || "-",
        r.status,
        r.performedAt ? new Date(r.performedAt).toLocaleDateString() : "-",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    triggerGuidance("export_ready", t("labs_exportSuccess"));
  };

  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || result.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedResults = paginate(filteredResults, visiblePage, PAGE_SIZE);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Completed: t("labs_completed"),
      Pending: t("labs_pending"),
      Abnormal: t("labs_abnormal"),
      Reviewed: t("labs_reviewed"),
    };
    const key = status.charAt(0).toUpperCase() + status.slice(1);
    return map[key] ?? status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success-bg text-success-text border border-success/30";
      case "pending":
        return "bg-warning-bg text-warning-text border border-warning/30";
      case "abnormal":
        return "bg-critical-bg text-critical-text border border-critical/30";
      case "reviewed":
        return "bg-primary/10 text-primary border border-primary/25";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const isAbnormal = (status: string) => status === "abnormal";
  const isHighlightedRow = (status: string) => status === "abnormal";

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6 w-full h-full">
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1 flex items-center">
          <Beaker className="w-6 h-6 inline mr-2 text-primary" />
          {t("labs_title")}
        </h2>
        <PermissionDenied
          title={t("labs_forbiddenTitle") ?? "You don't have permission"}
          description={t("labs_forbidden") ?? "Only clinical and lab roles can view lab results."}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <FilePreviewDialog
        open={preview !== null}
        onOpenChange={(next) => {
          if (!next) setPreview(null);
        }}
        title={preview?.title ?? ""}
        url={preview?.url ?? null}
      />
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1 flex items-center">
            <Beaker className="w-6 h-6 inline mr-2 text-primary" />
            {t("labs_title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("labs_subtitle")}
          </p>
        </div>

        <FeatureTip tipId="labs-ordervsresult">
        <div className="flex gap-2">
          <AddLabOrderDialog onSuccess={fetchLabResults} />
          <AddLabResultDialog onSuccess={fetchLabResults} />
        </div>
        </FeatureTip>
      </div>

      <div className="bg-card border border-border rounded-lg flex-1 shadow-xs flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-muted-bg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Input
            type="search"
            placeholder={t("labs_search")}
            className="w-full sm:max-w-sm h-9"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 h-9"
                >
                  <FilterIcon className="w-4 h-4" /> {t("common_status")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t("labs_filterByStatus")}</DropdownMenuLabel>
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
                  {t("labs_completed")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "pending"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "pending" ? null : "pending",
                    )
                  }
                >
                  {t("labs_pending")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "abnormal"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "abnormal" ? null : "abnormal",
                    )
                  }
                >
                  {t("labs_abnormal")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "reviewed"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "reviewed" ? null : "reviewed",
                    )
                  }
                >
                  {t("labs_reviewed")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2 h-9"
            >
              <Download className="w-4 h-4" /> {t("labs_export")}
            </Button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{t("labs_loading")}</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Beaker className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">{t("labs_empty")}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-start">
              <thead className="bg-muted-bg text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 border-b border-border">{t("labs_colPatient")}</th>
                  <th className="px-6 py-3.5 border-b border-border">{t("labs_colTest")}</th>
                  <th className="px-6 py-3.5 border-b border-border">{t("labs_colResult")}</th>
                  <th className="px-6 py-3.5 border-b border-border">{t("labs_colStatus")}</th>
                  <th className="px-6 py-3.5 border-b border-border hidden md:table-cell">
                    {t("labs_colPerformed")}
                  </th>
                  <th className="px-6 py-3.5 border-b border-border">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {pagedResults.map((result) => (
                  <tr
                    key={result.id}
                    className={`transition-colors ${
                      isHighlightedRow(result.status)
                        ? "bg-critical-bg/50 text-foreground hover:bg-critical-bg/80"
                        : "hover:bg-muted-bg/60"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary font-bold flex justify-center items-center text-xs">
                          {result.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <p className="font-semibold text-foreground">{result.patientName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{result.testName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {result.resultValue && (
                          <>
                            <p className="font-semibold text-foreground">
                              {result.resultValue} {result.unit || ""}
                            </p>
                            {result.referenceRange && (
                              <p
                                className={`text-xs ${
                                  isHighlightedRow(result.status)
                                    ? "text-critical-text font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {t("labs_range")}: {result.referenceRange}
                              </p>
                            )}
                          </>
                        )}
                        {!result.resultValue && (
                          <p className="text-muted-foreground">-</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-semibold inline-flex items-center ${getStatusColor(result.status)}`}
                      >
                        {isAbnormal(result.status) && (
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                        )}
                        {statusLabel(result.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                      {result.performedAt
                        ? new Date(result.performedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {result.reportUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            isHighlightedRow(result.status)
                              ? "h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              : "h-8"
                          }
                          onClick={() =>
                            setPreview({
                              title: `${result.patientName} — ${result.testName}`,
                              url: result.reportUrl as string,
                            })
                          }
                        >
                          <Eye className="mr-1.5 h-4 w-4" />{t("labs_viewReport")}
                        </Button>
                      ) : (
                        <span
                          className={
                            isHighlightedRow(result.status)
                              ? "text-xs text-destructive"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {t("labs_noReport")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredResults.length > PAGE_SIZE ? (
          <DataPagination
            page={visiblePage}
            pageSize={PAGE_SIZE}
            total={filteredResults.length}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <LabOrdersSection onChanged={fetchLabResults} />
    </div>
  );
}
