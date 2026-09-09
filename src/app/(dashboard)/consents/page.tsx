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
import { paginate } from "@/lib/pagination";
import { logClientError } from "@/lib/client-logger";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";

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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [consents, setConsents] = React.useState<Consent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [grantedFilter, setGrantedFilter] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const { forbidden, setForbidden } = usePermissionState();

  React.useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/consents");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch consents");
      const data = await response.json();
      setConsents(data);
    } catch (error) {
      toast.error("Failed to load consents");
      logClientError("Consent list fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Patient Name", "Consent Type", "Status", "Signed Date", "Document"],
      ...consents.map((c) => [
        c.patientName,
        c.consentType,
        c.isGranted ? "Granted" : "Denied",
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
    toast.success("Consents exported successfully");
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

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6 w-full h-full">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
          Consent Center
        </h2>
        <PermissionDenied
          title="You don't have permission"
          description="Only staff with patient access can view consent center."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <CheckCircle2 className="w-6 h-6 inline mr-2" />
            Consent Management
          </h2>
          <p className="text-sm text-neutral-500">
            Track and manage patient consents for treatments and services.
          </p>
        </div>

        <FeatureTip tipId="consents-log">
          <span className="inline-flex">
            <AddConsentDialog onSuccess={fetchConsents} />
          </span>
        </FeatureTip>
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Input
            type="search"
            placeholder="Search patient name or consent type..."
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
                  <FilterIcon className="w-4 h-4" /> Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!grantedFilter}
                  onCheckedChange={() => setGrantedFilter(null)}
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={grantedFilter === "granted"}
                  onCheckedChange={() =>
                    setGrantedFilter(
                      grantedFilter === "granted" ? null : "granted",
                    )
                  }
                >
                  Granted
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={grantedFilter === "denied"}
                  onCheckedChange={() =>
                    setGrantedFilter(
                      grantedFilter === "denied" ? null : "denied",
                    )
                  }
                >
                  Denied
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-neutral-500">Loading consents...</p>
            </div>
          ) : filteredConsents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CheckCircle2 className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-neutral-600">No consents found</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b">Patient</th>
                  <th className="px-6 py-4 border-b">Consent Type</th>
                  <th className="px-6 py-4 border-b">Status</th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    Signed Date
                  </th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    Document
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                {pagedConsents.map((consent) => (
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
                        {consent.isGranted ? "Granted" : "Denied"}
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
                          View
                        </a>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
