"use client";

import * as React from "react";
import {
  CheckCircle2,
  Filter as FilterIcon,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
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
import { AddConsentDialog } from "@/components/consents/add-consent-dialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
  useDelayedLoading,
} from "@/components/ui/loading";
import { paginate } from "@/lib/pagination";
import { logClientError } from "@/lib/client-logger";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { useLocale } from "@/components/locale/locale-provider";

interface Consent {
  id: string;
  patientId: string;
  patientName: string;
  consentType: string;
  isGranted: boolean;
  documentUrl: string | null;
  signedAt: string | null;
  createdAt: string;
}

export default function ConsentsPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [consents, setConsents] = React.useState<Consent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [grantedFilter, setGrantedFilter] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const { forbidden, setForbidden } = usePermissionState();

  const fetchConsents = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await fetch("/api/consents");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch consents");
      const data = await response.json();
      setConsents(data);
    } catch (error) {
      setError(true);
      toast.error(t("consent_loadError"));
      logClientError("Consent list fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [setForbidden, t]);

  React.useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const handleExport = () => {
    const csv = [
      [
        t("common_patient"),
        t("consent_colType"),
        t("common_status"),
        t("consent_colSigned"),
        t("consent_colDocument"),
      ],
      ...consents.map((c) => [
        c.patientName,
        c.consentType,
        c.isGranted ? t("consent_granted") : t("consent_denied"),
        c.signedAt ? new Date(c.signedAt).toLocaleDateString() : "-",
        c.documentUrl ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consents-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t("consent_exportSuccess"));
  };

  const filteredConsents = consents.filter((consent) => {
    const matchesSearch =
      consent.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      consent.consentType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      !grantedFilter ||
      (grantedFilter === "granted" && consent.isGranted) ||
      (grantedFilter === "denied" && !consent.isGranted);

    return matchesSearch && matchesFilter;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredConsents.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedConsents = paginate(filteredConsents, visiblePage, PAGE_SIZE);
  const showSkeleton = useDelayedLoading(loading);

  const resetFilters = () => {
    setSearchQuery("");
    setGrantedFilter(null);
    setPage(1);
  };

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6 w-full h-full">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
          {t("consent_title")}
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
            <CheckCircle2 className="w-6 h-6 inline me-2" />
            {t("consent_title")}
          </h2>
          <p className="text-sm text-neutral-500">{t("consent_subtitle")}</p>
        </div>

        <FeatureTip tipId="consents-log">
          <span className="inline-flex">
            <AddConsentDialog onSuccess={fetchConsents} />
          </span>
        </FeatureTip>
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b">
          <FilterBar
            hasActiveFilters={searchQuery !== "" || grantedFilter !== null}
            onReset={resetFilters}
          >
            <Input
              type="search"
              placeholder={t("consent_searchPlaceholder")}
              className="w-full sm:max-w-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
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
                <DropdownMenuLabel>
                  {t("consent_filterByStatus")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!grantedFilter}
                  onCheckedChange={() => setGrantedFilter(null)}
                >
                  {t("common_all")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={grantedFilter === "granted"}
                  onCheckedChange={() =>
                    setGrantedFilter(
                      grantedFilter === "granted" ? null : "granted",
                    )
                  }
                >
                  {t("consent_granted")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={grantedFilter === "denied"}
                  onCheckedChange={() =>
                    setGrantedFilter(
                      grantedFilter === "denied" ? null : "denied",
                    )
                  }
                >
                  {t("consent_denied")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                <th className="px-6 py-4 border-b">{t("consent_colType")}</th>
                <th className="px-6 py-4 border-b">{t("common_status")}</th>
                <th className="px-6 py-4 border-b hidden md:table-cell">
                  {t("consent_colSigned")}
                </th>
                <th className="px-6 py-4 border-b hidden md:table-cell">
                  {t("consent_colDocument")}
                </th>
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
                      title={t("consent_loadError")}
                      onRetry={fetchConsents}
                    />
                  </td>
                </tr>
              ) : filteredConsents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-0 py-4">
                    <EmptyState
                      icon={
                        <CheckCircle2 className="w-10 h-10 text-neutral-300" />
                      }
                      title={t("consent_empty")}
                    />
                  </td>
                </tr>
              ) : (
                pagedConsents.map((consent) => (
                  <tr
                    key={consent.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[5px] bg-green-100 text-green-700 font-bold flex justify-center items-center text-xs">
                          {consent.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <p className="font-medium">{consent.patientName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{consent.consentType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          consent.isGranted
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {consent.isGranted
                          ? t("consent_granted")
                          : t("consent_denied")}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {consent.signedAt
                        ? new Date(consent.signedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {consent.documentUrl ? (
                        <a
                          href={consent.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {t("common_view")}
                        </a>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredConsents.length > PAGE_SIZE ? (
          <DataPagination
            page={visiblePage}
            pageSize={PAGE_SIZE}
            total={filteredConsents.length}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}