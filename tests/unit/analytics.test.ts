import { describe, expect, it } from "vitest";
import { averageMinutes, percentage } from "@/lib/analytics";

describe("analytics calculations", () => {
  it("calculates guarded percentages", () => {
    expect(percentage(3, 4)).toBe(75);
    expect(percentage(1, 0)).toBe(0);
  });

  it("calculates rounded visit durations", () => {
    expect(averageMinutes([30 * 60000, 50 * 60000])).toBe(40);
    expect(averageMinutes([])).toBe(0);
  });
});
