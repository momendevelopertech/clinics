import { describe, expect, it } from "vitest";
import { isTelehealthAppointment, shouldShowJoinLink } from "@/lib/telehealth";

describe("telehealth helpers", () => {
  it("detects telehealth visits case-insensitively", () => {
    expect(isTelehealthAppointment("Telehealth")).toBe(true);
    expect(isTelehealthAppointment("telehealth")).toBe(true);
    expect(isTelehealthAppointment("consultation")).toBe(false);
    expect(isTelehealthAppointment(null)).toBe(false);
  });

  it("shows Join only for live-ish linked visits", () => {
    const base = {
      appointmentType: "Telehealth",
      telehealthUrl: "https://meet.example/x",
      status: "scheduled",
      now: new Date("2026-09-11T10:00:00Z"),
    };
    expect(
      shouldShowJoinLink({ ...base, startTime: new Date("2026-09-11T12:00:00Z") }),
    ).toBe(true);
    // Too far out / long over / closed / unlinked / in-person.
    expect(
      shouldShowJoinLink({ ...base, startTime: new Date("2026-09-13T12:00:00Z") }),
    ).toBe(false);
    expect(
      shouldShowJoinLink({ ...base, startTime: new Date("2026-09-11T07:00:00Z") }),
    ).toBe(false);
    expect(shouldShowJoinLink({ ...base, status: "cancelled", startTime: new Date() })).toBe(false);
    expect(shouldShowJoinLink({ ...base, telehealthUrl: null, startTime: new Date() })).toBe(false);
    expect(
      shouldShowJoinLink({ ...base, appointmentType: "consultation", startTime: new Date() }),
    ).toBe(false);
  });
});
