import { describe, expect, it } from "vitest";
import { toTrendSeries, trendStats } from "@/lib/vitals-trend";

const rows = [
  { recordedAt: "2026-09-01", bloodPressureSystolic: 150 },
  { recordedAt: "2026-09-05", bloodPressureSystolic: 140 },
  { recordedAt: "2026-09-09", bloodPressureSystolic: "n/a" },
  { recordedAt: "2026-08-28", bloodPressureSystolic: 152 },
];

describe("vitals trend", () => {
  it("filters non-numeric values and sorts by time", () => {
    const points = toTrendSeries(rows, "bloodPressureSystolic");
    expect(points.map((p) => p.value)).toEqual([152, 150, 140]);
  });

  it("computes min/max/avg/last/delta", () => {
    const stats = trendStats(toTrendSeries(rows, "bloodPressureSystolic"));
    expect(stats).toMatchObject({ count: 3, min: 140, max: 152, last: 140, delta: -12 });
    expect(stats.avg).toBeCloseTo(147.3, 1);
  });

  it("returns nulls on empty series", () => {
    expect(trendStats([])).toMatchObject({ count: 0, min: null, avg: null, delta: null });
  });
});
