import { describe, expect, it } from "vitest";
import { netProfit } from "@/lib/analytics";
import { expenseCreateSchema } from "@/lib/validations";

describe("netProfit", () => {
  it("subtracts expenses from revenue, cent-safe", () => {
    expect(netProfit(1000, 350.5)).toBe(649.5);
    expect(netProfit(0, 0)).toBe(0);
    expect(netProfit(100, 150)).toBe(-50);
    expect(netProfit(10.1, 0.2)).toBe(9.9);
  });
});

describe("expenseCreateSchema", () => {
  it("accepts a valid expense", () => {
    expect(
      expenseCreateSchema.safeParse({
        category: "rent",
        amount: 5000,
        spentAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it("rejects unknown categories and non-positive amounts", () => {
    expect(expenseCreateSchema.safeParse({ category: "yacht", amount: 10 }).success).toBe(false);
    expect(expenseCreateSchema.safeParse({ category: "supplies", amount: 0 }).success).toBe(false);
    expect(expenseCreateSchema.safeParse({ category: "supplies", amount: -5 }).success).toBe(false);
  });
});
