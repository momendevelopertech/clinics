"use client";

import * as React from "react";
import { FileText, Filter as FilterIcon, Download, Upload } from "lucide-react";
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
import { DataPagination } from "@/components/ui/data-pagination";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
  useDelayedLoading,
} from "@/components/ui/loading";
import { toast } from "sonner";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { GenerateDocumentDialog } from "@/components/documents/generate-document-dialog";
import { paginate } from "@/lib/pagination";
import { filterDocuments, formatTypeLabel, getDocumentTypeColor, isExternalUrl } from "@/lib/documents";
import { logClientError } from "@/lib/client-logger";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { usePermissionState } from "@/hooks/use-permission-state";
import { useLocale } from "@/components/locale/locale-provider";

interface Document {
  id: string;
  patientId: string;
  patientName: string;
  name: string;
  type: string;
  storageKey: string;
  mimeType: string | null;
  createdAt: string;
}

const PAGE_SIZE = 10;

function isDocument(value: unknown): value is Document {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Document).id === "string" &&
    typeof (value as Document).patientName === "string" &&
    typeof (value as Document).name === "string" &&
    typeof (value as Document).type === "string"
  );
}

const DOC_TYPE_KEYS: Record<string, string> = {
  imaging: "docType_imaging",
  lab: "docType_lab",
  lab_report: "docType_lab",
  pathology: "docType_pathology",
  consent: "docType_consent",
  medical_record: "docType_medicalRecord",
  prescription: "docType_prescription",
  referral: "doc_tpl_referral",
  medical_report: "doc_tpl_medical_report",
  lab_request: "doc_tpl_lab_request",
  imaging_request: "doc_tpl_imaging_request",
  discharge_summary: "doc_tpl_discharge_summary",
  sick_leave: "doc_tpl_sick_leave",
  treatment_plan: "doc_tpl_treatment_plan",
  other: "docType_other",
};

export default function DocumentsPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const { forbidden, setForbidden } = usePermissionState();

  const fetchDocuments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await fetch("/api/documents");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data.filter(isDocument) : []);
    } catch (error) {
      setError(true);
      toast.error(t("doc_loadError"));
      logClientError("Document list fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [setForbidden, t]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleExport = () => {
    const csv = [
      [t("common_patient"), t("common_type"), t("doc_colFile"), t("common_date")],
      ...documents.map((d) => [
        d.patientName,
        d.type,
        d.name,
        new Date(d.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documents-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t("doc_exportSuccess"));
  };

  const filteredDocuments = filterDocuments(documents, searchQuery, typeFilter);

  const availableTypes = React.useMemo(
    () => Array.from(new Set(documents.map((document) => document.type))).sort(),
    [documents],
  );

  const docTypeLabel = (type: string) =>
    DOC_TYPE_KEYS[type] ? t(DOC_TYPE_KEYS[type]) : formatTypeLabel(type);

  const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedDocuments = paginate(filteredDocuments, visiblePage, PAGE_SIZE);
  const showSkeleton = useDelayedLoading(loading);

  const handleTypeFilterChange = (type: string | null) => {
    setTypeFilter(type);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter(null);
    setPage(1);
  };

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6 w-full h-full">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
          <FileText className="w-6 h-6 inline me-2" />
          {t("doc_title")}
        </h2>
        <PermissionDenied />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <FileText className="w-6 h-6 inline me-2" />
            {t("doc_title")}
          </h2>
          <p className="text-sm text-neutral-500">{t("doc_subtitle")}</p>
        </div>

        <div className="flex gap-2">
          <GenerateDocumentDialog onSuccess={fetchDocuments} />
          <UploadDocumentDialog onSuccess={fetchDocuments} />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b">
          <FilterBar
            hasActiveFilters={searchQuery !== "" || typeFilter !== null}
            onReset={resetFilters}
          >
            <Input
              type="search"
              placeholder={t("doc_searchPlaceholder")}
              className="w-full sm:max-w-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <FeatureTip tipId="documents-types">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FilterIcon className="w-4 h-4" /> {t("common_type")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t("doc_filterByType")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={!typeFilter}
                    onCheckedChange={() => {
                      setTypeFilter(null);
                      setPage(1);
                    }}
                  >
                    {t("common_all")}
                  </DropdownMenuCheckboxItem>
                  {availableTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={typeFilter === type}
                      onCheckedChange={() =>
                        handleTypeFilterChange(typeFilter === type ? null : type)
                      }
                    >
                      {docTypeLabel(type)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FeatureTip>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> {t("common_export")}
            </Button>
          </FilterBar>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          <table className="w-full text-sm text-start">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-4 border-b">{t("common_patient")}</th>
                <th className="px-6 py-4 border-b">{t("doc_colFile")}</th>
                <th className="px-6 py-4 border-b">{t("common_type")}</th>
                <th className="px-6 py-4 border-b hidden md:table-cell">
                  {t("doc_colUploaded")}
                </th>
                <th className="px-6 py-4 border-b">{t("common_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
              {showSkeleton ? (
                <tr>
                  <td colSpan={5} className="px-0">
                    <TableSkeleton rows={5} columns={5} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-0 py-4">
                    <ErrorState
                      title={t("doc_loadError")}
                      onRetry={fetchDocuments}
                    />
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-0 py-4">
                    <EmptyState
                      icon={<Upload className="w-10 h-10 text-neutral-300" />}
                      title={t("doc_empty")}
                    />
                  </td>
                </tr>
              ) : (
                pagedDocuments.map((document) => (
                  <tr
                    key={document.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[5px] bg-amber-100 text-amber-700 font-bold flex justify-center items-center text-xs">
                          {document.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <p className="font-medium">{document.patientName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium truncate max-w-xs">
                        {document.name}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getDocumentTypeColor(document.type)}`}
                      >
                        {docTypeLabel(document.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {isExternalUrl(document.storageKey) ? (
                        <a
                          href={document.storageKey}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            {t("common_view")}
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-400">
                          {t("common_noFile")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredDocuments.length > PAGE_SIZE ? (
          <DataPagination
            page={visiblePage}
            pageSize={PAGE_SIZE}
            total={filteredDocuments.length}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}