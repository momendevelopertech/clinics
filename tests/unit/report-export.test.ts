import { describe, expect, it } from "vitest";
import { buildMonthlyCsv, isScheduleDue } from "@/lib/report-export";

describe("buildMonthlyCsv", () => {
  it("emits summary, services, and escapes quotes", () => {
    const csv = buildMonthlyCsv(
      "2026-09",
      {
        totalAppointments: 10,
        completed: 8,
        cancelled: 1,
        noShow: 1,
        completionRate: 80,
        revenue: 1000,
        expenses: 200,
        net: 800,
        outstanding: 100,
      },
      [{ name: 'Laser "deluxe"', count: 3, revenue: 900 }],
    );
    expect(csv).toContain('"2026-09"');
    expect(csv).toContain('"Net profit","800"');
    expect(csv).toContain('"Laser ""deluxe""","3","900"');
  });
});

describe("isScheduleDue", () => {
  const june10 = new Date("2026-06-10T00:00:00");
  it("fires once the day arrives and once per month", () => {
    expect(isScheduleDue({ frequency: "monthly", dayOfMonth: 1, lastSentAt: null, active: true }, june10)).toBe(true);
    expect(
      isScheduleDue(
        { frequency: "monthly", dayOfMonth: 15, lastSentAt: null, active: true },
        june10,
      ),
    ).toBe(false);
    expect(
      isScheduleDue(
        { frequency: "monthly", dayOfMonth: 1, lastSentAt: new Date("2026-06-02"), active: true },
        june10,
      ),
    ).toBe(false);
    expect(
      isScheduleDue(
        { frequency: "monthly", dayOfMonth: 1, lastSentAt: new Date("2026-05-02"), active: true },
        june10,
      ),
    ).toBe(true);
    expect(
      isScheduleDue(
        { frequency: "monthly", dayOfMonth: 1, lastSentAt: null, active: false },
        june10,
      ),
    ).toBe(false);
  });
});
