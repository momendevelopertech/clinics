"use client";

import * as React from "react";
import {
  Filter as FilterIcon,
  Download,
  Clock,
  Calendar,
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
import { AddToWaitlistDialog } from "@/components/waitlist/add-to-waitlist-dialog";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

interface WaitlistEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  preferredDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export default function WaitlistPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [entries, setEntries] = React.useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/waitlist");
      if (!response.ok) throw new Error("Failed to fetch waitlist");
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      toast.error(t("wl_loadError"));
      logClientError("Waitlist fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Patient Name", "Email", "Phone", "Preferred Date", "Status", "Notes"],
      ...entries.map((e) => [
        e.patientName,
        e.patientEmail,
        e.patientPhone,
        e.preferredDate ? new Date(e.preferredDate).toLocaleDateString() : "-",
        e.status,
        e.notes || "-",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t("wl_exportSuccess"));
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.patientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.patientPhone.includes(searchQuery);

    const matchesStatus = !statusFilter || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Waiting: t("wl_waiting"),
      Contacted: t("wl_contacted"),
      Scheduled: t("wl_scheduled"),
      Cancelled: t("wl_cancelled"),
    };
    const key = status.charAt(0).toUpperCase() + status.slice(1);
    return map[key] ?? status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-100 text-yellow-800";
      case "contacted":
        return "bg-blue-100 text-blue-800";
      case "scheduled":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <Clock className="w-6 h-6 inline mr-2" />
            {t("wl_title")}
          </h2>
          <p className="text-sm text-neutral-500">
            {t("wl_subtitle")}
          </p>
        </div>

        <AddToWaitlistDialog onSuccess={fetchWaitlist} />
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Input
            type="search"
            placeholder={t("wl_search")}
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                <DropdownMenuLabel>{t("wl_filterByStatus")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!statusFilter}
                  onCheckedChange={() => setStatusFilter(null)}
                >
                  {t("common_all")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "waiting"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "waiting" ? null : "waiting",
                    )
                  }
                >
                  {t("wl_waiting")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "contacted"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "contacted" ? null : "contacted",
                    )
                  }
                >
                  {t("wl_contacted")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "scheduled"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "scheduled" ? null : "scheduled",
                    )
                  }
                >
                  {t("wl_scheduled")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "cancelled"}
                  onCheckedChange={() =>
                    setStatusFilter(
                      statusFilter === "cancelled" ? null : "cancelled",
                    )
                  }
                >
                  {t("wl_cancelled")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> {t("wl_export")}
            </Button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-neutral-500">{t("wl_loading")}</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Calendar className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-neutral-600">{t("wl_empty")}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b">{t("wl_colPatient")}</th>
                  <th className="px-6 py-4 border-b">{t("wl_colContact")}</th>
                  <th className="px-6 py-4 border-b">{t("wl_colPreferredDate")}</th>
                  <th className="px-6 py-4 border-b">{t("wl_colStatus")}</th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    {t("wl_colAdded")}
                  </th>
                  <th className="px-6 py-4 border-b">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[5px] bg-indigo-100 text-indigo-700 font-bold flex justify-center items-center text-xs">
                          {entry.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{entry.patientName}</p>
                          {entry.notes && (
                            <p className="text-xs text-neutral-500">
                              {entry.notes.substring(0, 30)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p>{entry.patientEmail}</p>
                        <p className="text-neutral-500">{entry.patientPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {entry.preferredDate
                        ? new Date(entry.preferredDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(entry.status)}`}
                      >
                        {statusLabel(entry.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm">
                        {t("wl_view")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
