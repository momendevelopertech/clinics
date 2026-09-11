import { describe, expect, it } from "vitest";
import { isAppointmentTransitionAllowed } from "@/lib/appointments";
import { queueActionSchema, waitlistBookSchema, waitlistUpdateSchema } from "@/lib/validations/ops";

describe("queue actions", () => {
  it("validates the action payload", () => {
    expect(queueActionSchema.safeParse({ action: "call-next" }).success).toBe(true);
    expect(queueActionSchema.safeParse({ action: "complete", appointmentId: "a1" }).success).toBe(true);
    expect(queueActionSchema.safeParse({ action: "skip" }).success).toBe(false);
  });

  it("allows the reception flow arrived -> in_progress -> completed", () => {
    expect(isAppointmentTransitionAllowed("arrived", "in_progress")).toBe(true);
    expect(isAppointmentTransitionAllowed("in_progress", "completed")).toBe(true);
  });

  it("rejects illegal queue jumps", () => {
    expect(isAppointmentTransitionAllowed("scheduled", "in_progress")).toBe(false);
    expect(isAppointmentTransitionAllowed("scheduled", "completed")).toBe(false);
    expect(isAppointmentTransitionAllowed("completed", "no_show")).toBe(false);
  });

  it("allows no-show from the waiting line", () => {
    for (const from of ["scheduled", "confirmed", "arrived"]) {
      expect(isAppointmentTransitionAllowed(from, "no_show")).toBe(true);
    }
  });
});

describe("waitlist booking", () => {
  const future = new Date(Date.now() + 3600_000).toISOString();
  const later = new Date(Date.now() + 5400_000).toISOString();
  it("validates the booking payload", () => {
    expect(
      waitlistBookSchema.safeParse({ providerId: "doc1", startTime: future, endTime: later }).success,
    ).toBe(true);
    expect(waitlistBookSchema.safeParse({ providerId: "doc1", startTime: "soon" }).success).toBe(
      false,
    );
  });

  it("supports the booked terminal status", () => {
    expect(waitlistUpdateSchema.safeParse({ status: "booked" }).success).toBe(true);
    expect(waitlistUpdateSchema.safeParse({ status: "waiting" }).success).toBe(true);
  });
});
