"use client";

import * as React from "react";
import {
  Beaker,
  Filter as FilterIcon,
  Download,
  TrendingUp,
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
import { AddLabResultDialog } from "@/components/labs/add-lab-result-dialog";
import { AddLabOrderDialog } from "@/components/labs/add-lab-order-dialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<LabResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const { forbidden, setForbidden } = usePermissionState();

  React.useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
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
  };

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
    toast.success(t("labs_exportSuccess"));
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
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "abnormal":
        return "bg-red-100 text-red-800";
      case "reviewed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isAbnormal = (status: string) => status === "abnormal";
  const isHighlightedRow = (status: string) => status === "abnormal";

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6 w-full h-full">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
          <Beaker className="w-6 h-6 inline mr-2" />
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <Beaker className="w-6 h-6 inline mr-2" />
            {t("labs_title")}
          </h2>
          <p className="text-sm text-neutral-500">
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

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Input
            type="search"
            placeholder={t("labs_search")}
            className="w-full sm:max-w-sm"
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
                  className="flex items-center gap-2"
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
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> {t("labs_export")}
            </Button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-neutral-500">{t("labs_loading")}</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Beaker className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-neutral-600">{t("labs_empty")}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b">{t("labs_colPatient")}</th>
                  <th className="px-6 py-4 border-b">{t("labs_colTest")}</th>
                  <th className="px-6 py-4 border-b">{t("labs_colResult")}</th>
                  <th className="px-6 py-4 border-b">{t("labs_colStatus")}</th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    {t("labs_colPerformed")}
                  </th>
                  <th className="px-6 py-4 border-b">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                {pagedResults.map((result) => (
                  <tr
                    key={result.id}
                    className={`transition ${
                      isHighlightedRow(result.status)
                        ? "bg-red-50 text-red-950 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-50 dark:hover:bg-red-950/40"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[5px] bg-purple-100 text-purple-700 font-bold flex justify-center items-center text-xs">
                          {result.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <p className="font-medium">{result.patientName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{result.testName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {result.resultValue && (
                          <>
                            <p className="font-medium">
                              {result.resultValue} {result.unit || ""}
                            </p>
                            {result.referenceRange && (
                              <p
                                className={`text-xs ${
                                  isHighlightedRow(result.status)
                                    ? "text-red-700 dark:text-red-200/80"
                                    : "text-neutral-500"
                                }`}
                              >
                                {t("labs_range")}: {result.referenceRange}
                              </p>
                            )}
                          </>
                        )}
                        {!result.resultValue && (
                          <p className="text-neutral-500">-</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.status)}`}
                      >
                        {isAbnormal(result.status) && (
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                        )}
                        {statusLabel(result.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {result.performedAt
                        ? new Date(result.performedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {result.reportUrl ? (
                        <a
                          href={result.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className={
                              isHighlightedRow(result.status)
                                ? "text-red-900 hover:bg-red-200/60 dark:text-red-100 dark:hover:bg-red-900/30"
                                : undefined
                            }
                          >
                            {t("labs_viewReport")}
                          </Button>
                        </a>
                      ) : (
                        <span
                          className={
                            isHighlightedRow(result.status)
                              ? "text-xs text-red-700 dark:text-red-200/80"
                              : "text-xs text-neutral-400"
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
    </div>
  );
}
