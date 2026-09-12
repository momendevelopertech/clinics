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

export const treatmentPlanCreateSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().min(1).optional().nullable(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const treatmentPlanUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
});

export const treatmentPlanStepCreateSchema = z.object({
  kind: z.enum(["diagnosis", "prescription", "procedure", "followup", "note"]),
  refId: z.string().min(1).max(100).optional().nullable(),
  title: z.string().trim().min(1).max(200),
  dueDate: z.string().datetime().optional().nullable(),
});

export const treatmentPlanStepUpdateSchema = z.object({
  status: z.enum(["pending", "done", "skipped"]),
});

export const servicePackageCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  serviceCatalogId: z.string().min(1).max(100).optional().nullable(),
  procedureName: z.string().trim().max(160).optional().nullable(),
  totalSessions: z.number().int().min(1).max(500),
  price: z.number().finite().nonnegative().max(100_000_000),
});

export const patientPackageCreateSchema = z.object({
  patientId: z.string().min(1),
  packageId: z.string().min(1),
  pricePaid: z.number().finite().nonnegative().max(100_000_000).optional().nullable(),
});

export const patientPackageUpdateSchema = z.object({
  status: z.enum(["active", "cancelled"]).optional(),
  pricePaid: z.number().finite().nonnegative().max(100_000_000).optional().nullable(),
});
