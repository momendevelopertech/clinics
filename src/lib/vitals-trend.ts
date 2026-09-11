/** Vitals trend series + stats (pure). No chart dependency — the UI draws
 * a dependency-free SVG sparkline from these points. */

export const TREND_METRICS = [
  "weightKg",
  "bloodPressureSystolic",
  "bloodPressureDiastolic",
  "heartRate",
  "bmi",
  "spO2",
  "temperature",
] as const;

export type TrendMetric = (typeof TREND_METRICS)[number];

export interface TrendPoint {
  t: string;
  value: number;
}

export interface TrendStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  last: number | null;
  delta: number | null;
}

export function toTrendSeries(
  vitals: Array<Record<string, unknown>>,
  metric: TrendMetric,
): TrendPoint[] {
  return vitals
    .filter((v) => typeof v[metric] === "number" && Number.isFinite(v[metric] as number))
    .map((v) => ({
      t: String(v.recordedAt ?? v.createdAt ?? ""),
      value: v[metric] as number,
    }))
    .sort((a, b) => a.t.localeCompare(b.t));
}

export function trendStats(points: TrendPoint[]): TrendStats {
  if (points.length === 0) {
    return { count: 0, min: null, max: null, avg: null, last: null, delta: null };
  }
  const values = points.map((p) => p.value);
  const sum = values.reduce((s, v) => s + v, 0);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    count: points.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: round1(sum / values.length),
    last: values[values.length - 1],
    delta: round1(values[values.length - 1] - values[0]),
  };
}
