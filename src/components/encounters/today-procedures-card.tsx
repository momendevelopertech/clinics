"use client";

import * as React from "react";
import { Check, Loader2, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { logClientError } from "@/lib/client-logger";

type ProcedureRow = {
  id: string;
  procedureName: string;
  status: string;
  scheduledAt: string | null;
  performedByRole: string | null;
  performer: { id: string; name: string | null } | null;
  patient: { firstName: string; lastName: string };
  serviceCatalog: { code: string; name: string } | null;
};

/**
 * G6: "Today's procedures" — the simplified Nurse flow.
 * Open/in-progress injections & vaccinations of the day in one place;
 * Nurse executes and closes with one click (performer recorded server-side).
 */
export function TodayProceduresCard() {
  const { t } = useLocale();
  const [rows, setRows] = React.useState<ProcedureRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [visible, setVisible] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/procedure-orders?today=true");
      if (res.status === 403) {
        setVisible(false);
        return;
      }
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as ProcedureRow[];
      setRows(Array.isArray(data) ? data.filter((r) => r.status !== "completed" && r.status !== "cancelled") : []);
    } catch (e) {
      logClientError("Today procedures load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const advance = async (row: ProcedureRow) => {
    const next = row.status === "ordered" ? "in_progress" : "completed";
    try {
      setBusyId(row.id);
      const res = await fetch(`/api/procedure-orders/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("update");
      toast.success(t("common_saved"));
      await load();
    } catch (e) {
      toast.error(t("common_error"));
      logClientError("Procedure advance failed", e);
    } finally {
      setBusyId(null);
    }
  };

  if (!visible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Syringe className="h-4 w-4 text-primary" />
          {t("proc_todayTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">{t("common_loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("proc_todayEmpty")}</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{row.procedureName}</p>
                <p className="text-xs text-muted-foreground">
                  {row.patient.firstName} {row.patient.lastName}
                  {row.serviceCatalog ? ` · ${row.serviceCatalog.name}` : ""}
                  {` · ${row.status}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 px-2.5 text-xs"
                disabled={busyId === row.id}
                onClick={() => void advance(row)}
              >
                {busyId === row.id ? (
                  <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="me-1 h-3.5 w-3.5" />
                )}
                {row.status === "ordered" ? t("proc_start") : t("proc_complete")}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
