import { z } from "zod";

export const procedureOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().min(1).optional().nullable(),
  serviceCatalogId: z.string().min(1).optional().nullable(),
  procedureName: z.string().trim().min(1).max(160),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const procedureUpdateSchema = z.object({
  status: z.enum(["ordered", "in_progress", "completed", "cancelled"]),
  notes: z.string().max(2000).optional().nullable(),
});
