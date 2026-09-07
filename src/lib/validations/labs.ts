import { z } from "zod";

export const labOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().min(1).optional().nullable(),
  orderType: z.enum(["lab", "imaging"]),
  testName: z.string().trim().min(1).max(160),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  indication: z.string().trim().max(500).optional().nullable(),
});

export const labResultSchema = z.object({
  orderId: z.string().min(1).optional().nullable(),
  patientId: z.string().min(1),
  testName: z.string().trim().min(1).max(160),
  resultValue: z.string().max(2000).optional().nullable(),
  unit: z.string().max(80).optional().nullable(),
  referenceRange: z.string().max(200).optional().nullable(),
  status: z.enum(["pending", "completed", "abnormal"]).default("completed"),
  performedAt: z.string().date().optional().nullable(),
  reportUrl: z.string().url().optional().nullable(),
});

export const labReviewSchema = z.object({
  status: z.enum(["reviewed", "abnormal"]),
  reviewNote: z.string().trim().max(2000).optional().nullable(),
});
