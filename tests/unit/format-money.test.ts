import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/format-money";

describe("formatMoney", () => {
  it("formats USD amounts with grouping and two decimals", () => {
    const formatted = formatMoney(1000, "USD", "en-US");
    expect(formatted).toContain("1,000");
    expect(formatted).toContain("$");
  });

  it("returns an em dash for null or undefined", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });

  it("returns an em dash for NaN", () => {
    expect(formatMoney(NaN)).toBe("—");
  });

  it("formats EUR amounts with the euro symbol", () => {
    const formatted = formatMoney(250.5, "EUR", "en-US");
    expect(formatted).toContain("€");
    expect(formatted).toContain("250.50");
  });

  it("handles string-coercible input", () => {
    const formatted = formatMoney("250.5", "USD", "en-US");
    expect(formatted).toContain("250.50");
    expect(formatted).toContain("$");
  });
});
