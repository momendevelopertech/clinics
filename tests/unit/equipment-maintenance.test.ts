import { describe, expect, it } from "vitest";
import {
  getEquipmentCalibrationAlertStatus,
  getMaintenanceSummary,
} from "@/lib/equipment-maintenance";

describe("equipment maintenance", () => {
  it("flags calibration as overdue when due date has passed", () => {
    const now = new Date("2026-09-11T12:00:00Z");
    const status = getEquipmentCalibrationAlertStatus(
      { nextCalibrationAt: new Date("2026-09-01T00:00:00Z"), status: "active" },
      now,
    );
    expect(status).toBe("overdue");
  });

  it("flags calibration as warning when due in under two weeks", () => {
    const now = new Date("2026-09-11T12:00:00Z");
    const status = getEquipmentCalibrationAlertStatus(
      { nextCalibrationAt: new Date("2026-09-20T00:00:00Z"), status: "active" },
      now,
    );
    expect(status).toBe("warning");
  });

  it("summarizes maintenance states for dashboard reporting", () => {
    const summary = getMaintenanceSummary([
      { status: "overdue", dueAt: new Date("2026-09-01") },
      { status: "scheduled", dueAt: new Date("2026-09-20") },
      { status: "completed", dueAt: new Date("2026-09-10") },
    ]);
    expect(summary).toEqual({ overdue: 1, scheduled: 1, completed: 1 });
  });
});
