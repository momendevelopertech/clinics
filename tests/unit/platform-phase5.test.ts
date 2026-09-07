import { describe, expect, it } from "vitest";
import { notificationCreateSchema, organizationSettingsSchema } from "@/lib/validations";

describe("platform controls", () => {
  it("validates notification records", () => {
    expect(notificationCreateSchema.safeParse({ recipientId: "u1", title: "Review", body: "New result" }).success).toBe(true);
  });
  it("validates persisted clinic settings", () => {
    expect(organizationSettingsSchema.safeParse({ appointmentDurationMins: 30, currency: "USD", defaultTaxRate: 5 }).success).toBe(true);
    expect(organizationSettingsSchema.safeParse({ appointmentDurationMins: 0, currency: "USD", defaultTaxRate: 5 }).success).toBe(false);
  });
});
