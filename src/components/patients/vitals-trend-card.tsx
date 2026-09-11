"use client";

import * as React from "react";
import { logClientError } from "@/lib/client-logger";
import type { Dictionary } from "@/lib/i18n/locale";

interface TrendPoint {
  t: string;
  value: number;
}

interface TrendStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  last: number | null;
  delta: number | null;
}

const METRICS = [
  "bloodPressureSystolic",
  "bloodPressureDiastolic",
  "heartRate",
  "weightKg",
  "bmi",
  "spO2",
  "temperature",
];

function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;
  const W = 560;
  const H = 140;
  const PAD = 10;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (W - PAD * 2) / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = PAD + i * step;
      const y = H - PAD - ((p.value - min) / span) * (H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="vitals trend">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
      {points.map((p, i) => {
        const x = PAD + i * step;
        const y = H - PAD - ((p.value - min) / span) * (H - PAD * 2);
        return <circle key={i} cx={x} cy={y} r="3" className="fill-primary" />;
      })}
    </svg>
  );
}

export function VitalsTrendCard({
  patientId,
  t,
}: {
  patientId: string;
  t: Dictionary;
}) {
  const [metric, setMetric] = React.useState("bloodPressureSystolic");
  const [points, setPoints] = React.useState<TrendPoint[]>([]);
  const [stats, setStats] = React.useState<TrendStats | null>(null);

  React.useEffect(() => {
    fetch(`/api/vitals/trend?patientId=${patientId}&metric=${metric}&days=180`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setPoints(d.points);
          setStats(d.stats);
        }
      })
      .catch((e) => logClientError("Vitals trend failed", e));
  }, [patientId, metric]);

  return (
    <div className="rounded-[20px] border border-white/55 bg-white/60 p-4 dark:border-white/6 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t["trend_title"]}</p>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          aria-label={t["trend_metric"]}
        >
          {METRICS.map((m) => (
            <option key={m} value={m}>
              {t[`trend_${m}`] ?? m}
            </option>
          ))}
        </select>
      </div>
      {points.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t["trend_empty"]}</p>
      ) : (
        <>
          <div className="mt-2"><Sparkline points={points} /></div>
          {stats ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{t["trend_last"]}: {stats.last}</span>
              <span>{t["trend_avg"]}: {stats.avg}</span>
              <span>{t["trend_range"]}: {stats.min}–{stats.max}</span>
              <span>
                {t["trend_change"]}: {stats.delta != null && stats.delta > 0 ? "+" : ""}{stats.delta}
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
