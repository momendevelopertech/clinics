import { describe, expect, it } from "vitest";
import {
  appointmentCreateSchema,
  appointmentUpdateSchema,
} from "../../src/lib/validations/appointment";
import { patientCreateSchema } from "../../src/lib/validations/patient";
import { consentCreateSchema, consentUpdateSchema } from "../../src/lib/validations/ops";
import { organizationSettingsSchema } from "../../src/lib/validations/settings";
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

  it("validates consent create and partial update payloads", () => {
    expect(
      consentCreateSchema.safeParse({
        patientId: "patient-1",
        consentType: "treatment",
        isGranted: true,
      }).success,
    ).toBe(true);
    expect(
      consentCreateSchema.safeParse({ patientId: "", consentType: "x" }).success,
    ).toBe(false);

    expect(
      consentUpdateSchema.safeParse({ isGranted: false }).success,
    ).toBe(true);
    expect(consentUpdateSchema.safeParse({}).success).toBe(true);
    expect(
      consentUpdateSchema.safeParse({ signedAt: "not-a-date" }).success,
    ).toBe(false);
    expect(
      consentUpdateSchema.safeParse({ documentUrl: "notaurl" }).success,
    ).toBe(false);
  });

  it("carries the clinic logo public id for asset cleanup", () => {
    const parsed = organizationSettingsSchema.safeParse({
      clinicLogoUrl: "https://res.cloudinary.com/demo/image/upload/logo.png",
      clinicLogoPublicId: "clinics/org-1/clinic_logo/logo",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.clinicLogoPublicId).toBe(
        "clinics/org-1/clinic_logo/logo",
      );
    }
    const empty = organizationSettingsSchema.safeParse({});
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.clinicLogoPublicId).toBeNull();
    }
  });

  it("keeps English and Arabic dictionaries in sync", () => {    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
    for (const [key, value] of Object.entries(ar)) {
      expect(value).not.toBe(key);
    }
  });
});
