import { describe, expect, it } from "vitest";
import { signupSchema } from "../../src/app/api/signup/route";

const validPayload = {
  clinicName: "مركز الإسكندرية الطبي",
  ownerName: "أحمد محمد",
  email: "owner@clinic.com",
  password: "password123",
  phone: "+201012345678",
  city: "Alexandria",
  country: "Egypt",
  website: "",
  company: "",
  startedAt: Date.now() - 10000,
};

describe("signup validation", () => {
  it("accepts a complete, valid signup payload", () => {
    expect(signupSchema.safeParse(validPayload).success).toBe(true);
  });

  it("accepts a human start time (longer than the 3s anti-bot window)", () => {
    const minFill = signupSchema.safeParse({
      ...validPayload,
      startedAt: Date.now() - 5000,
    });
    expect(minFill.success).toBe(true);
  });

  it("rejects a missing required clinic name", () => {
    const { success } = signupSchema.safeParse({ ...validPayload, clinicName: " " });
    expect(success).toBe(false);
  });

  it("rejects a weak password shorter than 8 chars", () => {
    const { success } = signupSchema.safeParse({ ...validPayload, password: "short" });
    expect(success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const { success } = signupSchema.safeParse({ ...validPayload, email: "not-an-email" });
    expect(success).toBe(false);
  });

  it("rejects when the honeypot field is filled", () => {
    const { success } = signupSchema.safeParse({ ...validPayload, company: "bot" });
    expect(success).toBe(false);
  });
});
