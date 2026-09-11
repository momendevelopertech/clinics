import { describe, expect, it } from "vitest";
import { applyCouponDiscount, buildInstallmentSchedule } from "@/lib/installments";
import {
  couponCreateSchema,
  installmentPaySchema,
  installmentPlanCreateSchema,
} from "@/lib/validations";

describe("buildInstallmentSchedule", () => {
  it("splits evenly with monthly steps", () => {
    const out = buildInstallmentSchedule({
      total: 1000,
      count: 4,
      firstDueDate: new Date("2026-10-01T00:00:00Z"),
      frequency: "monthly",
    });
    expect(out).toHaveLength(4);
    expect(out.map((d) => d.amount)).toEqual([250, 250, 250, 250]);
    expect(out[1].dueDate.getUTCMonth()).toBe(10);
  });

  it("pushes the cent remainder to the last due and sums exactly", () => {
    const out = buildInstallmentSchedule({
      total: 100,
      count: 3,
      firstDueDate: new Date("2026-10-01T00:00:00Z"),
      frequency: "weekly",
    });
    expect(out.map((d) => d.amount)).toEqual([33.33, 33.33, 33.34]);
    const sum = out.reduce((s, d) => s + d.amount, 0);
    expect(Math.round(sum * 100)).toBe(10000);
    expect(out[1].dueDate.getUTCDate() - out[0].dueDate.getUTCDate()).toBe(7);
  });

  it("rejects bad totals and counts", () => {
    const base = { total: 100, firstDueDate: new Date(), frequency: "monthly" as const };
    expect(() => buildInstallmentSchedule({ ...base, count: 1 })).toThrow();
    expect(() => buildInstallmentSchedule({ ...base, count: 25 })).toThrow();
    expect(() => buildInstallmentSchedule({ ...base, total: 0, count: 3 })).toThrow();
  });
});

describe("applyCouponDiscount", () => {
  const live = { active: true, expiresAt: null };
  it("computes percent and fixed discounts capped at subtotal", () => {
    expect(applyCouponDiscount(200, { ...live, kind: "percent", value: 10 })).toBe(20);
    expect(applyCouponDiscount(200, { ...live, kind: "fixed", value: 50 })).toBe(50);
    expect(applyCouponDiscount(30, { ...live, kind: "fixed", value: 50 })).toBe(30);
    expect(applyCouponDiscount(200, { ...live, kind: "percent", value: 150 })).toBe(200);
  });

  it("ignores inactive, expired, and unknown coupons", () => {
    expect(
      applyCouponDiscount(200, { kind: "percent", value: 10, active: false, expiresAt: null }),
    ).toBe(0);
    expect(
      applyCouponDiscount(200, {
        kind: "percent",
        value: 10,
        active: true,
        expiresAt: new Date("2020-01-01"),
      }),
    ).toBe(0);
    expect(applyCouponDiscount(200, { ...live, kind: "mystery", value: 10 })).toBe(0);
  });
});

describe("installment + coupon schemas", () => {
  it("validates plan creation bounds", () => {
    expect(
      installmentPlanCreateSchema.safeParse({
        invoiceId: "inv",
        count: 6,
        firstDueDate: new Date().toISOString(),
      }).success,
    ).toBe(true);
    expect(
      installmentPlanCreateSchema.safeParse({ invoiceId: "inv", count: 1, firstDueDate: "x" })
        .success,
    ).toBe(false);
  });

  it("validates coupon codes and pay payloads", () => {
    expect(
      couponCreateSchema.safeParse({ code: " ramadan10 ", kind: "percent", value: 10 }).success,
    ).toBe(true);
    expect(
      couponCreateSchema.safeParse({ code: "x", kind: "percent", value: 10 }).success,
    ).toBe(false);
    expect(installmentPaySchema.safeParse({ installmentId: "d1", method: "cash" }).success).toBe(
      true,
    );
    expect(installmentPaySchema.safeParse({ installmentId: "d1", method: "card" }).success).toBe(
      true,
    );
  });
});
