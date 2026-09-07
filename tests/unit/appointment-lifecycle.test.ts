import { describe, expect, it } from "vitest";
import { isAppointmentTransitionAllowed } from "@/lib/appointments";

describe("appointment lifecycle", () => {
  it("allows the operational appointment flow", () => {
    expect(isAppointmentTransitionAllowed("scheduled", "confirmed")).toBe(true);
    expect(isAppointmentTransitionAllowed("confirmed", "arrived")).toBe(true);
    expect(isAppointmentTransitionAllowed("arrived", "in_progress")).toBe(true);
    expect(isAppointmentTransitionAllowed("in_progress", "completed")).toBe(true);
  });

  it("prevents reopening terminal appointments", () => {
    expect(isAppointmentTransitionAllowed("completed", "scheduled")).toBe(false);
    expect(isAppointmentTransitionAllowed("cancelled", "confirmed")).toBe(false);
  });
});
