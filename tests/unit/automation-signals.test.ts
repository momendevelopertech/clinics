import { describe, expect, it } from "vitest";
import {
  buildAutomationSignals,
  buildFollowUpEscalationMessage,
} from "@/lib/automation";

describe("buildFollowUpEscalationMessage", () => {
  it("produces the outreach reminder text", () => {
    const message = buildFollowUpEscalationMessage({
      patientFirstName: "Sara",
      clinicName: "Al Noor Clinic",
      reason: "Review blood pressure",
    });
    expect(message).toContain("Hi Sara");
    expect(message).toContain("Al Noor Clinic");
    expect(message).toContain("Review blood pressure");
  });
});

describe("buildAutomationSignals", () => {
  const base = {
    overdueFollowUps: [
      {
        id: "f1",
        patientId: "p1",
        patientName: "Sara Ali",
        reason: "Review blood pressure",
        dueDate: new Date("2026-01-01T08:00:00Z"),
      },
    ],
    unreviewedAbnormalLabs: [],
    recentNoShows: [],
  };

  it("builds an overdue follow-up signal", () => {
    const signals = buildAutomationSignals(base);
    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("follow_up");
    expect(signals[0].priority).toBe("medium");
    expect(signals[0].href).toBe("/patients/p1");
  });

  it("hard-caps the signal list at 50 entries", () => {
    const signals = buildAutomationSignals({
      overdueFollowUps: Array.from({ length: 60 }, (_, i) => ({
        id: `f${i}`,
        patientId: `p${i}`,
        patientName: `P ${i}`,
        reason: "r",
        dueDate: new Date(),
      })),
      unreviewedAbnormalLabs: [],
      recentNoShows: [],
    });
    expect(signals.length).toBeLessThanOrEqual(50);
  });
});