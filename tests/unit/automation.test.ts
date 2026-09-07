import { describe, expect, it } from "vitest";
import { buildAutomationSignals } from "@/lib/automation";

describe("read-only automation signals", () => {
  it("prioritizes abnormal lab review and never creates mutations", () => {
    const signals = buildAutomationSignals({
      overdueFollowUps: [],
      unreviewedAbnormalLabs: [{
        id: "lab-1",
        patientId: "patient-1",
        patientName: "Test Patient",
        testName: "A1C",
        createdAt: new Date("2026-09-01"),
      }],
      recentNoShows: [],
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ kind: "lab_review", priority: "high", patientId: "patient-1" });
  });
});
