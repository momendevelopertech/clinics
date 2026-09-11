import { describe, expect, it } from "vitest";
import { canConsumeSession, sessionsRemaining, statusAfterConsume } from "@/lib/packages";
import { patientPackageCreateSchema, servicePackageCreateSchema } from "@/lib/validations";

describe("package balance", () => {
  it("computes remaining without going negative", () => {
    expect(sessionsRemaining(10, 3)).toBe(7);
    expect(sessionsRemaining(10, 10)).toBe(0);
    expect(sessionsRemaining(10, 99)).toBe(0);
  });

  it("gates consumption on status and balance", () => {
    expect(canConsumeSession({ status: "active", sessionsTotal: 10, sessionsUsed: 9 })).toBe(true);
    expect(canConsumeSession({ status: "active", sessionsTotal: 10, sessionsUsed: 10 })).toBe(false);
    expect(canConsumeSession({ status: "cancelled", sessionsTotal: 10, sessionsUsed: 0 })).toBe(false);
    expect(canConsumeSession({ status: "completed", sessionsTotal: 10, sessionsUsed: 9 })).toBe(false);
  });

  it("completes the plan on the last session", () => {
    expect(statusAfterConsume(10, 10)).toBe("completed");
    expect(statusAfterConsume(10, 9)).toBe("active");
  });
});

describe("package schemas", () => {
  it("validates package definitions and assignments", () => {
    expect(
      servicePackageCreateSchema.safeParse({ name: "Laser ×8", totalSessions: 8, price: 4000 })
        .success,
    ).toBe(true);
    expect(
      servicePackageCreateSchema.safeParse({ name: "x", totalSessions: 0, price: 1 }).success,
    ).toBe(false);
    expect(
      patientPackageCreateSchema.safeParse({ patientId: "p", packageId: "k" }).success,
    ).toBe(true);
  });
});
