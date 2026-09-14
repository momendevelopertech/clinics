"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarX2,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  UserX,
  Wallet,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { buildMonthlyCsv } from "@/lib/report-export";
import { formatMoney } from "@/lib/format-money";
import { Button } from "@/components/ui/button";

type ReportData = {
  month: string;
  summary: {
    totalAppointments: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    revenue: number;
    outstanding: number;
    expenses?: number;
    net?: number;
  };
  perDay: Array<{ day: string; total: number }>;
  perDoctor: Array<{ name: string; appointments: number }>;
  perService?: Array<{ name: string; count: number; revenue: number }>;
};

export function ReportsDashboard({ t }: { t: Dictionary }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/monthly?month=${month}`, { cache: "no-store" });
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (response.ok) {
        setData((await response.json()) as ReportData);
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const csv = useMemo(() => {
    if (!data) return "";
    return buildMonthlyCsv(data.month, data.summary, data.perService ?? []);
  }, [data]);

  function exportCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${data?.month ?? month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportXlsx() {
    if (!data) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const summaryRows: Array<[string, number | string]> = [
      ["Month", data.month],
      ["Total appointments", data.summary.totalAppointments],
      ["Completed", data.summary.completed],
      ["Cancelled", data.summary.cancelled],
      ["No-shows", data.summary.noShow],
      ["Completion rate %", data.summary.completionRate],
      ["Revenue collected", data.summary.revenue],
      ["Outstanding added", data.summary.outstanding],
      ["Expenses", data.summary.expenses ?? 0],
      ["Net profit", data.summary.net ?? 0],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Service", "Quantity", "Revenue"],
        ...(data.perService ?? []).map((s) => [s.name, s.count, s.revenue] as Array<string | number>),
      ]),
      "Services",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Day", "Appointments"],
        ...data.perDay.map((r) => [r.day, r.total] as Array<string | number>),
      ]),
      "Daily",
    );
    XLSX.writeFile(wb, `report-${data.month}.xlsx`);
  }

  const maxDay = useMemo(
    () => Math.max(1, ...(data?.perDay.map((row) => row.total) ?? [1])),
    [data],
  );

  if (forbidden) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t["reports_title"]}</h1>
        <PermissionDenied
          title={t["reports_forbiddenTitle"] ?? "You don't have permission"}
          description={t["reports_forbidden"] ?? "Only staff with billing or clinical access can view reports."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t["reports_title"]}</h1>
          <p className="text-xs text-muted-foreground">
            {data ? `${data.summary.totalAppointments} ${t["reports_appointments"]}` : "…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 px-3 text-xs font-semibold gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            {t["reports_print"]}
          </Button>
          <Button
            size="sm"
            onClick={exportCsv}
            disabled={!data}
            className="h-9 px-3 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            {t["reports_exportCsv"]}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportXlsx()}
            disabled={!data}
            className="h-9 px-3 text-xs font-semibold gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {t["reports_exportXlsx"]}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-content-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{t["reports_noData"]}</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, label: t["reports_summaryAppointments"], value: data.summary.totalAppointments, token: "bg-primary/10 text-primary border border-primary/20" },
              { icon: CheckCircle2, label: t["reports_completed"], value: data.summary.completed, token: "bg-success-bg text-success-text border border-success/30" },
              { icon: CalendarX2, label: t["reports_cancelled"], value: data.summary.cancelled, token: "bg-warning-bg text-warning-text border border-warning/30" },
              { icon: UserX, label: t["reports_noShow"], value: data.summary.noShow, token: "bg-critical-bg text-critical-text border border-critical/30" },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border border-border bg-card p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
                  <div className={`grid size-8 place-content-center rounded-md ${card.token} print-hide`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Per-day bar chart */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print-hide">
                {t["reports_perDay"]}
              </p>
              <div className="mt-5 flex h-40 items-end gap-1.5 print-hide">
                {data.perDay.map((row) => (
                  <div key={row.day} className="group flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-medium text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      {row.total}
                    </span>
                    <div
                      className="w-full rounded-t-xs bg-primary transition hover:bg-primary-hover"
                      style={{ height: `${Math.max(4, (row.total / maxDay) * 130)}px` }}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">{row.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-doctor breakdown */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t["reports_perDoctor"]}
              </p>
              <div className="mt-4 space-y-2.5">
                {data.perDoctor.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">{t["reports_noData"]}</p>
                ) : (
                  data.perDoctor.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-3 text-xs rounded-md bg-muted-bg/50 px-3 py-2">
                      <span className="font-semibold text-foreground">{row.name}</span>
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary font-mono">
                        {row.appointments}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Per-service revenue */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t["reports_perService"]}
            </p>
            <div className="mt-4 space-y-2.5">
              {(data.perService ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">{t["reports_noData"]}</p>
              ) : (
                (data.perService ?? []).map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 text-xs rounded-md bg-muted-bg/50 px-3 py-2">
                    <span className="font-semibold text-foreground">{row.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {row.count} · <strong className="text-foreground">{formatMoney(row.revenue)}</strong>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Financial summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-content-center rounded-md bg-success-bg text-success-text border border-success/30 print-hide">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold font-mono tracking-tight text-foreground">{formatMoney(data.summary.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{t["reports_revenue"]}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-content-center rounded-md bg-warning-bg text-warning-text border border-warning/30 print-hide">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold font-mono tracking-tight text-foreground">{formatMoney(data.summary.outstanding)}</p>
                  <p className="text-xs text-muted-foreground">{t["reports_outstanding"]}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-content-center rounded-md bg-critical-bg text-critical-text border border-critical/30 print-hide">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold font-mono tracking-tight text-foreground">{formatMoney(data.summary.expenses ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">{t["reports_expenses"]}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-content-center rounded-md bg-accent-blue-bg text-accent-blue-text border border-accent-blue/30 print-hide">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold font-mono tracking-tight text-foreground">{formatMoney(data.summary.net ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">{t["reports_net"]}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}