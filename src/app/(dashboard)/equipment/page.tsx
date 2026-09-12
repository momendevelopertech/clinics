"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

type Equipment = {
  id: string;
  name: string;
  type: string | null;
  status: string;
  nextCalibrationAt: string | null;
  calibrationAlert?: "ok" | "warning" | "overdue";
  maintenances?: Array<{ id: string; dueAt: string | null; status: string }>;
};

type Maintenance = {
  id: string;
  type: string;
  status: string;
  description: string | null;
  technician: string | null;
  dueAt: string | null;
  performedAt: string | null;
  notes: string | null;
  cost: number | string | null;
};

const PAGE_SIZE = 10;
const EQUIPMENT_TYPES = ["device", "instrument", "furniture", "vehicle", "other"];
const EQUIPMENT_STATUSES = ["active", "inactive", "maintenance_required"];
const MAINT_TYPES = ["preventive", "repair", "calibration", "inspection"];
const MAINT_STATUSES = ["scheduled", "in_progress", "completed", "overdue"];

export default function EquipmentPage() {
  const { t } = useLocale();
  const { forbidden, guardedFetch } = usePermissionState();
  const [items, setItems] = React.useState<Equipment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<Maintenance[]>([]);
  const [logLoading, setLogLoading] = React.useState(false);

  const [form, setForm] = React.useState({ name: "", type: "device", status: "active", nextCalibrationAt: "" });
  const [maintForm, setMaintForm] = React.useState({
    type: "preventive",
    status: "completed",
    description: "",
    technician: "",
    dueAt: "",
    cost: "",
  });

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await guardedFetch<Equipment[]>("/api/equipment");
      if (data) setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      logClientError("Equipment load failed", error);
    } finally {
      setLoading(false);
    }
  }, [guardedFetch]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const loadLog = React.useCallback(
    async (id: string) => {
      setLogLoading(true);
      try {
        const data = await guardedFetch<{ maintenances: Maintenance[] }>(`/api/equipment/${id}/maintenance`);
        if (data) setLog(data.maintenances ?? []);
      } catch (error) {
        logClientError("Maintenance log load failed", error);
      } finally {
        setLogLoading(false);
      }
    },
    [guardedFetch],
  );

  React.useEffect(() => {
    if (selectedId) void loadLog(selectedId);
    else setLog([]);
  }, [selectedId, loadLog]);

  const filtered = items.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = paginate(filtered, Math.min(page, pageCount), PAGE_SIZE);

  const alertLabel = (alert?: string) => {
    if (alert === "overdue") return t("eq_calOverdue");
    if (alert === "warning") return t("eq_calWarning");
    return t("eq_calOk");
  };

  async function createEquipment() {
    try {
      const r = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          status: form.status,
          nextCalibrationAt: form.nextCalibrationAt ? new Date(form.nextCalibrationAt).toISOString() : undefined,
        }),
      });
      if (!r.ok) throw new Error("create failed");
      toast.success(t("common_success"));
      setForm({ name: "", type: "device", status: "active", nextCalibrationAt: "" });
      await loadItems();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Equipment create failed", error);
    }
  }

  async function addMaintenance() {
    if (!selectedId) return;
    try {
      const r = await fetch(`/api/equipment/${selectedId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: maintForm.type,
          status: maintForm.status,
          description: maintForm.description || undefined,
          technician: maintForm.technician || undefined,
          dueAt: maintForm.dueAt ? new Date(maintForm.dueAt).toISOString() : undefined,
          cost: maintForm.cost ? Number(maintForm.cost) : undefined,
        }),
      });
      if (!r.ok) throw new Error("save failed");
      toast.success(t("common_success"));
      setMaintForm({ type: "preventive", status: "completed", description: "", technician: "", dueAt: "", cost: "" });
      await loadLog(selectedId);
      await loadItems();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Maintenance save failed", error);
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav_equipment")}</h1>
        <PermissionDenied
          title={t("eq_forbiddenTitle") ?? "You don't have permission"}
          description={t("eq_forbidden") ?? "Only inventory roles can view equipment."}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <UpgradePrompt moduleKey="inventory" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="w-6 h-6" />
          {t("nav_equipment")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("eq_subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {t("eq_items")}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Input
              type="search"
              placeholder={t("eq_search")}
              className="w-full sm:max-w-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("common_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common_all")}</SelectItem>
                {EQUIPMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`eq_status_${s}`) === `eq_status_${s}` ? s : t(`eq_status_${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-neutral-500">{t("common_loading")}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 border rounded-[5px]">{t("eq_empty")}</div>
          ) : (
            <div className="rounded-[5px] border overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("common_name")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common_type")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common_status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("eq_colCalibration")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">{item.type ?? "—"}</td>
                      <td className="px-4 py-3">
                        {t(`eq_status_${item.status}`) === `eq_status_${item.status}`
                          ? item.status
                          : t(`eq_status_${item.status}`)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            item.calibrationAlert === "overdue"
                              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                              : item.calibrationAlert === "warning"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                          )}
                        >
                          {alertLabel(item.calibrationAlert)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant={selectedId === item.id ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                        >
                          {t("eq_viewLog")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > PAGE_SIZE ? (
            <DataPagination
              page={Math.min(page, pageCount)}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("eq_new")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label>{t("common_name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("common_type")}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("common_status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`eq_status_${s}`) === `eq_status_${s}` ? s : t(`eq_status_${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>
                {t("eq_nextCalibration")} ({t("common_optional")})
              </Label>
              <Input
                type="date"
                value={form.nextCalibrationAt}
                onChange={(e) => setForm({ ...form, nextCalibrationAt: e.target.value })}
              />
            </div>
            <div>
              <Button disabled={!form.name.trim()} onClick={() => void createEquipment()}>
                {t("common_add")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("eq_maintenance")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!selectedId ? (
              <p className="text-sm text-muted-foreground">{t("eq_selectHint")}</p>
            ) : logLoading ? (
              <p className="text-sm text-muted-foreground">{t("common_loading")}</p>
            ) : (
              <>
                {log.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("eq_emptyLog")}</p>
                ) : (
                  <div className="rounded-[5px] border overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {log.map((m) => (
                          <tr key={m.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                            <td className="px-4 py-2 font-medium">{m.type}</td>
                            <td className="px-4 py-2">{m.status}</td>
                            <td className="px-4 py-2 text-neutral-500">
                              {m.performedAt ? new Date(m.performedAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-2 text-neutral-500">{m.technician ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>{t("common_type")}</Label>
                    <Select value={maintForm.type} onValueChange={(v) => setMaintForm({ ...maintForm, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAINT_TYPES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("common_status")}</Label>
                    <Select value={maintForm.status} onValueChange={(v) => setMaintForm({ ...maintForm, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAINT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>
                      {t("eq_technician")} ({t("common_optional")})
                    </Label>
                    <Input value={maintForm.technician} onChange={(e) => setMaintForm({ ...maintForm, technician: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>
                      {t("eq_dueAt")} ({t("common_optional")})
                    </Label>
                    <Input
                      type="date"
                      value={maintForm.dueAt}
                      onChange={(e) => setMaintForm({ ...maintForm, dueAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>
                    {t("common_notes")} ({t("common_optional")})
                  </Label>
                  <Input value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} />
                </div>
                <div>
                  <Button onClick={() => void addMaintenance()}>{t("eq_addLog")}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
