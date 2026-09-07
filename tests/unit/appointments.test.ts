import { describe, expect, it, vi } from "vitest";
import {
  hasAppointmentConflict,
  isDoctorAvailable,
  nextWalkInToken,
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
