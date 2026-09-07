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
  };
  perDay: Array<{ day: string; total: number }>;
  perDoctor: Array<{ name: string; appointments: number }>;
};

export function ReportsDashboard({ t }: { t: Dictionary }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/monthly?month=${month}`, { cache: "no-store" });
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
    const lines: string[] = [];
    lines.push(
      ["Day", "Appointments"].join(","),
      ...data.perDay.map((row) => [row.day, row.total].join(",")),
    );
    lines.push("");
    lines.push(
      ["Doctor", "Appointments"].join(","),
      ...data.perDoctor.map((row) => [`"${row.name}"`, row.appointments].join(",")),
    );
    lines.push("");
    lines.push(
      ["Metric", "Value"].join(","),
      ["Total appointments", data.summary.totalAppointments].join(","),
      ["Completed", data.summary.completed].join(","),
      ["Cancelled", data.summary.cancelled].join(","),
      ["No-shows", data.summary.noShow].join(","),
      ["Completion rate %", data.summary.completionRate].join(","),
      ["Revenue collected", data.summary.revenue].join(","),
      ["Outstanding added", data.summary.outstanding].join(","),
    );
    return lines.join("\n");
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

  const maxDay = useMemo(
    () => Math.max(1, ...(data?.perDay.map((row) => row.total) ?? [1])),
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t["reports_title"]}</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.summary.totalAppointments} ${t["reports_appointments"]}` : "…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-11 rounded-[16px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
          />
          <button
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-white/60 bg-white/70 px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-white dark:border-white/6 dark:bg-white/[0.04]"
          >
            <Printer className="h-4 w-4" />
            {t["reports_print"]}
          </button>
          <button
            onClick={exportCsv}
            disabled={!data}
            className="inline-flex h-11 items-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {t["reports_exportCsv"]}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-content-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{t["reports_noData"]}</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, label: t["reports_summaryAppointments"], value: data.summary.totalAppointments },
              { icon: CheckCircle2, label: t["reports_completed"], value: data.summary.completed },
              { icon: CalendarX2, label: t["reports_cancelled"], value: data.summary.cancelled },
              { icon: UserX, label: t["reports_noShow"], value: data.summary.noShow },
            ].map((card) => (
              <div key={card.label} className="surface-panel rounded-[24px] border border-white/55 p-5 dark:border-white/6">
                <div className="grid size-11 place-content-center rounded-[14px] bg-primary/10 text-primary print-hide">
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight">{card.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Per-day bar chart */}
            <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground print-hide">
                {t["reports_perDay"]}
              </p>
              <div className="mt-5 flex h-40 items-end gap-1.5 print-hide">
                {data.perDay.map((row) => (
                  <div key={row.day} className="group flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      {row.total}
                    </span>
                    <div
                      className="w-full rounded-t-[6px] bg-linear-to-t from-primary to-cyan-400 transition hover:opacity-80"
                      style={{ height: `${Math.max(4, (row.total / maxDay) * 130)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{row.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-doctor breakdown */}
            <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {t["reports_perDoctor"]}
              </p>
              <div className="mt-4 space-y-3">
                {data.perDoctor.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t["reports_noData"]}</p>
                ) : (
                  data.perDoctor.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{row.name}</span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {row.appointments}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-content-center rounded-[14px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 print-hide">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">${data.summary.revenue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{t["reports_revenue"]}</p>
                </div>
              </div>
            </div>
            <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-content-center rounded-[14px] bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 print-hide">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">${data.summary.outstanding.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{t["reports_outstanding"]}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}