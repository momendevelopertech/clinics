import { describe, expect, it } from "vitest";
import { averageRating, feedbackCreateSchema } from "@/lib/validations/feedback";

describe("averageRating", () => {
  it("averages to one decimal, null on empty", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([5])).toBe(5);
    expect(averageRating([])).toBeNull();
  });
});

describe("feedbackCreateSchema", () => {
  it("accepts 1-5 with optional comment and visit", () => {
    expect(
      feedbackCreateSchema.safeParse({ rating: 5, comment: "Great", appointmentId: "a1" }).success,
    ).toBe(true);
    expect(feedbackCreateSchema.safeParse({ rating: 3 }).success).toBe(true);
  });

  it("rejects out-of-range ratings", () => {
    expect(feedbackCreateSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(feedbackCreateSchema.safeParse({ rating: 6 }).success).toBe(false);
  });
});
