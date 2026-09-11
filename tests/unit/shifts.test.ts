import { describe, expect, it } from "vitest";
import { findShiftConflict, shiftsOverlap, WEEKDAYS } from "@/lib/shifts";
import { shiftCreateSchema } from "@/lib/validations/staff";

describe("shift overlap", () => {
  it("detects same-user same-day intersections", () => {
    const base = { userId: "u1", weekday: 1, startTime: "09:00", endTime: "13:00" };
    expect(shiftsOverlap(base, { ...base, startTime: "12:00", endTime: "17:00" })).toBe(true);
    expect(shiftsOverlap(base, { ...base, startTime: "13:00", endTime: "17:00" })).toBe(false);
    expect(shiftsOverlap(base, { ...base, endTime: "09:00", startTime: "07:00" })).toBe(false);
  });

  it("ignores other users and other days", () => {
    const base = { userId: "u1", weekday: 1, startTime: "09:00", endTime: "13:00" };
    expect(shiftsOverlap(base, { ...base, userId: "u2" })).toBe(false);
    expect(shiftsOverlap(base, { ...base, weekday: 2 })).toBe(false);
  });

  it("finds the conflicting shift", () => {
    const existing = [
      { userId: "u1", weekday: 1, startTime: "09:00", endTime: "13:00" },
      { userId: "u1", weekday: 2, startTime: "09:00", endTime: "13:00" },
    ];
    expect(
      findShiftConflict(existing, { userId: "u1", weekday: 1, startTime: "10:00", endTime: "11:00" }),
    ).toMatchObject({ weekday: 1 });
    expect(
      findShiftConflict(existing, { userId: "u1", weekday: 1, startTime: "14:00", endTime: "18:00" }),
    ).toBeNull();
    expect(WEEKDAYS).toHaveLength(7);
  });
});

describe("shiftCreateSchema", () => {
  const base = { userId: "u1", weekday: 1, startTime: "09:00", endTime: "17:00" };
  it("accepts a valid shift", () => {
    expect(shiftCreateSchema.safeParse(base).success).toBe(true);
  });

  it("rejects inverted times, bad weekdays, bad clocks", () => {
    expect(shiftCreateSchema.safeParse({ ...base, endTime: "08:00" }).success).toBe(false);
    expect(shiftCreateSchema.safeParse({ ...base, weekday: 7 }).success).toBe(false);
    expect(shiftCreateSchema.safeParse({ ...base, startTime: "9am" }).success).toBe(false);
  });
});
