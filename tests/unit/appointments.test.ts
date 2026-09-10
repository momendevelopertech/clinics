import { describe, expect, it, vi } from "vitest";
import {
  canPatientCancelAppointment,
  canPatientRescheduleAppointment,
  getAvailableSlots,
  hasAppointmentConflict,
  isDoctorAvailable,
  isLateCancellation,
  nextWalkInToken,
  summarizeAttendance,
  toDayKey,
  toHM,
} from "../../src/lib/appointments";

describe("appointment scheduling helpers", () => {
  it("formats dates using local day and time keys", () => {
    const date = new Date(2026, 8, 7, 9, 5);

    expect(toDayKey(date)).toBe("mon");
    expect(toHM(date)).toBe("09:05");
  });

  it("enforces regular doctor availability by day and time window", () => {
    const provider = {
      availabilityType: "regular",
      availableDays: JSON.stringify(["mon"]),
      availableFrom: "09:00",
      availableTo: "17:00",
    };

    expect(isDoctorAvailable(provider, new Date(2026, 8, 7, 9, 0))).toEqual({
      available: true,
    });
    expect(isDoctorAvailable(provider, new Date(2026, 8, 7, 17, 1))).toEqual({
      available: false,
    });
    expect(isDoctorAvailable(provider, new Date(2026, 8, 8, 10, 0))).toEqual({
      available: false,
    });
  });

  it("allows non-regular availability types without a window", () => {
    expect(
      isDoctorAvailable(
        {
          availabilityType: "oncall",
          availableDays: null,
          availableFrom: null,
          availableTo: null,
        },
        new Date(2026, 8, 7, 3, 0),
      ),
    ).toEqual({ available: true });
  });

  it("detects only overlapping active appointments and excludes the current record", async () => {
    const findFirst = vi.fn().mockResolvedValueOnce({ id: "existing" }).mockResolvedValueOnce(null);
    const db = {
      appointment: { findFirst },
    } as unknown as Parameters<typeof hasAppointmentConflict>[0];
    const start = new Date(2026, 8, 7, 10, 0);
    const end = new Date(2026, 8, 7, 10, 30);

    await expect(hasAppointmentConflict(db, "doctor-1", start, end)).resolves.toBe(true);
    await expect(
      hasAppointmentConflict(db, "doctor-1", start, end, "existing"),
    ).resolves.toBe(false);
    expect(findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ id: { not: "existing" } }),
    }));
  });

  it("assigns the next daily walk-in token", async () => {
    const count = vi.fn().mockResolvedValue(9);
    const db = {
      appointment: { count },
    } as unknown as Parameters<typeof nextWalkInToken>[0];

    await expect(
      nextWalkInToken(db, "org-1", new Date(2026, 8, 7, 14, 30)),
    ).resolves.toBe("T-10");
    expect(count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        isWalkIn: true,
      }),
    }));
  });
});

describe("getAvailableSlots", () => {
  const provider = {
    availabilityType: "regular",
    availableDays: JSON.stringify(["mon", "tue", "wed", "thu", "fri"]),
    availableFrom: "09:00",
    availableTo: "12:00",
  };
  // Monday 2026-09-07, "now" far in the past so no slot is filtered as past.
  const monday = new Date(2026, 8, 7, 0, 0, 0);
  const past = new Date(2020, 0, 1);

  it("tiles the working window in duration steps", () => {
    const slots = getAvailableSlots({
      provider,
      date: monday,
      durationMins: 30,
      existingAppointments: [],
      now: past,
    });
    expect(slots).toHaveLength(6);
    expect(slots[0].start).toEqual(new Date(2026, 8, 7, 9, 0));
    expect(slots[5].end).toEqual(new Date(2026, 8, 7, 12, 0));
  });

  it("removes overlapping appointments and past slots", () => {
    const slots = getAvailableSlots({
      provider,
      date: monday,
      durationMins: 30,
      existingAppointments: [
        { startTime: new Date(2026, 8, 7, 9, 45), endTime: new Date(2026, 8, 7, 10, 15) },
      ],
      now: new Date(2026, 8, 7, 9, 40),
    });
    // 09:00 past, 09:30 + 10:00 overlap the booking, 10:30/11:00/11:30 free.
    expect(slots.map((s) => toHM(s.start))).toEqual(["10:30", "11:00", "11:30"]);
  });

  it("returns nothing outside working days or for bad input", () => {
    expect(
      getAvailableSlots({
        provider,
        date: new Date(2026, 8, 13), // Sunday
        durationMins: 30,
        existingAppointments: [],
        now: past,
      }),
    ).toEqual([]);
    expect(
      getAvailableSlots({ provider, date: monday, durationMins: 0, existingAppointments: [], now: past }),
    ).toEqual([]);
  });
});

describe("patient self-service guards", () => {
  const upcoming = { patientId: "pat-1", status: "scheduled", startTime: new Date(2026, 8, 8, 10, 0) };
  const now = new Date(2026, 8, 7, 10, 0);

  it("allows cancelling own future scheduled visits only", () => {
    expect(canPatientCancelAppointment(upcoming, "pat-1", now)).toBe(true);
    expect(canPatientCancelAppointment(upcoming, "pat-2", now)).toBe(false);
    expect(canPatientCancelAppointment({ ...upcoming, status: "completed" }, "pat-1", now)).toBe(false);
    expect(canPatientCancelAppointment({ ...upcoming, status: "cancelled" }, "pat-1", now)).toBe(false);
    expect(
      canPatientCancelAppointment(upcoming, "pat-1", new Date(2026, 8, 9, 10, 0)),
    ).toBe(false);
  });

  it("allows rescheduling own future scheduled/confirmed visits only", () => {
    expect(canPatientRescheduleAppointment(upcoming, "pat-1", now)).toBe(true);
    expect(
      canPatientRescheduleAppointment({ ...upcoming, status: "confirmed" }, "pat-1", now),
    ).toBe(true);
    expect(canPatientRescheduleAppointment(upcoming, "pat-2", now)).toBe(false);
    expect(
      canPatientRescheduleAppointment({ ...upcoming, status: "in_progress" }, "pat-1", now),
    ).toBe(false);
  });
});

describe("cancellation policy tracking", () => {
  const day = new Date(2026, 8, 8, 10, 0);

  it("flags cancellations inside the late window only", () => {
    expect(isLateCancellation(new Date(2026, 8, 7, 9, 0), day, 24)).toBe(false);
    expect(isLateCancellation(new Date(2026, 8, 7, 12, 0), day, 24)).toBe(true);
    expect(isLateCancellation(new Date(2026, 8, 9, 10, 0), day, 24)).toBe(false);
  });

  it("summarizes attendance and flags repeat no-shows", () => {
    const summary = summarizeAttendance(
      [
        { status: "completed", startTime: day, updatedAt: day },
        { status: "cancelled", startTime: day, updatedAt: new Date(2026, 8, 7, 12, 0) },
        { status: "no_show", startTime: day, updatedAt: day },
        { status: "no_show", startTime: day, updatedAt: day },
        { status: "no_show", startTime: day, updatedAt: day },
        { status: "scheduled", startTime: new Date(2026, 8, 20, 10, 0), updatedAt: day },
      ],
      { lateCancelHoursBefore: 24, maxNoShows: 3, noShowFee: 0 },
      new Date(2026, 8, 10, 10, 0),
    );
    expect(summary).toEqual({
      total: 5,
      completed: 1,
      cancelled: 1,
      lateCancels: 1,
      noShows: 3,
      flagged: true,
    });
  });
});
