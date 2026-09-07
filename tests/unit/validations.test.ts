import { describe, expect, it } from "vitest";
import {
  appointmentCreateSchema,
  appointmentUpdateSchema,
} from "../../src/lib/validations/appointment";
import { patientCreateSchema } from "../../src/lib/validations/patient";
import { ar } from "../../src/lib/i18n/dictionaries/ar";
import { en } from "../../src/lib/i18n/dictionaries/en";

describe("request validation", () => {
  it("accepts a valid appointment and rejects invalid time values", () => {
    const valid = appointmentCreateSchema.safeParse({
      patientId: "patient-1",
      providerId: "doctor-1",
      startTime: "2026-09-07T09:00:00.000Z",
      endTime: "2026-09-07T09:30:00.000Z",
    });
    const invalid = appointmentCreateSchema.safeParse({
      patientId: "",
      providerId: "doctor-1",
      startTime: "not-a-date",
      endTime: "2026-09-07T09:30:00.000Z",
      bufferMinutes: 121,
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("allows partial appointment updates but rejects unsupported statuses", () => {
    expect(
      appointmentUpdateSchema.safeParse({ status: "completed" }).success,
    ).toBe(true);
    expect(
      appointmentUpdateSchema.safeParse({ status: "booked" }).success,
    ).toBe(false);
  });

  it("requires patient names and validates optional email addresses", () => {
    expect(
      patientCreateSchema.safeParse({
        firstName: "Mona",
        lastName: "Ali",
        email: "mona@example.com",
      }).success,
    ).toBe(true);
    expect(
      patientCreateSchema.safeParse({
        firstName: "",
        lastName: "Ali",
        email: "invalid",
      }).success,
    ).toBe(false);
  });

  it("keeps English and Arabic dictionaries in sync", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
    for (const [key, value] of Object.entries(ar)) {
      expect(value).not.toBe(key);
    }
  });
});
