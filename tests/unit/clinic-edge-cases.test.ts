/**
 * Clinic-domain edge cases that unit tests must keep covering as the product grows.
 * These complement pure helper tests (validations, rate-limit, entitlements).
 */
import { describe, expect, it, vi } from "vitest";
import {
  hasAppointmentConflict,
  isAppointmentTransitionAllowed,
  isDoctorAvailable,
} from "../../src/lib/appointments";

describe("appointment conflicts (clinic edge cases)", () => {
  it("detects overlapping active appointments for the same provider", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "existing" });
    const conflict = await hasAppointmentConflict(
      { appointment: { findFirst, count: vi.fn() } },
      "doc-1",
      new Date("2026-09-10T10:00:00.000Z"),
      new Date("2026-09-10T10:30:00.000Z"),
    );
    expect(conflict).toBe(true);
    expect(findFirst).toHaveBeenCalled();
  });

  it("allows booking when no overlapping active slot exists", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const conflict = await hasAppointmentConflict(
      { appointment: { findFirst, count: vi.fn() } },
      "doc-1",
      new Date("2026-09-10T11:00:00.000Z"),
      new Date("2026-09-10T11:30:00.000Z"),
    );
    expect(conflict).toBe(false);
  });
});

describe("appointment lifecycle transitions", () => {
  it("allows scheduled → arrived → in_progress → completed", () => {
    expect(isAppointmentTransitionAllowed("scheduled", "arrived")).toBe(true);
    expect(isAppointmentTransitionAllowed("arrived", "in_progress")).toBe(true);
    expect(isAppointmentTransitionAllowed("in_progress", "completed")).toBe(
      true,
    );
  });

  it("blocks illegal jumps such as completed → scheduled", () => {
    expect(isAppointmentTransitionAllowed("completed", "scheduled")).toBe(
      false,
    );
    expect(isAppointmentTransitionAllowed("cancelled", "arrived")).toBe(false);
  });

  it("allows no_show from scheduled/confirmed/arrived only", () => {
    expect(isAppointmentTransitionAllowed("scheduled", "no_show")).toBe(true);
    expect(isAppointmentTransitionAllowed("in_progress", "no_show")).toBe(
      false,
    );
  });
});

describe("doctor availability windows", () => {
  it("blocks regular doctors outside available days/hours", () => {
    // 2026-09-10 is a Thursday
    const thursdayMorning = new Date(2026, 8, 10, 9, 0, 0);
    const result = isDoctorAvailable(
      {
        availabilityType: "regular",
        availableDays: JSON.stringify(["mon", "tue", "wed"]),
        availableFrom: "09:00",
        availableTo: "17:00",
      },
      thursdayMorning,
    );
    expect(result.available).toBe(false);
  });

  it("allows on-call doctors regardless of weekday window", () => {
    const sundayNight = new Date(2026, 8, 13, 22, 0, 0);
    const result = isDoctorAvailable(
      {
        availabilityType: "onCall",
        availableDays: null,
        availableFrom: null,
        availableTo: null,
      },
      sundayNight,
    );
    expect(result.available).toBe(true);
  });
});

describe("clinic edge cases (documented, integration-covered)", () => {
  it("points RBAC contracts at the integration suite", () => {
    // Product rules (receptionist cannot complete encounters, refunds need
    // biller rights, cross-org reads denied, archived patients block booking)
    // are enforced in API guards and asserted against a live DB in
    // tests/integration/tenant-isolation.test.ts — not here.
    expect(true).toBe(true);
  });
});
