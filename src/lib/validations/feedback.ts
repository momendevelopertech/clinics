import { z } from "zod";

export const feedbackCreateSchema = z.object({
  appointmentId: z.string().min(1).max(100).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

/** Mean rating rounded to one decimal; empty set → null (no data, not zero). */
export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10;
}
