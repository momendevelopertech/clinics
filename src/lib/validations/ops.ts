import { z } from "zod";

export const waitlistCreateSchema = z.object({
  patientId: z.string().min(1),
  preferredDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  patientId: z.string().min(1).optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
  taskType: z.string().max(80).optional().nullable(),
});

export const inventoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().max(80).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional().nullable(),
  unit: z.string().max(40).optional().nullable(),
});

export const communicationCreateSchema = z.object({
  patientId: z.string().min(1),
  channel: z.enum(["sms", "email", "whatsapp"]),
  type: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(8000),
  scheduledFor: z.string().datetime().optional().nullable(),
});

export const consentCreateSchema = z.object({
  patientId: z.string().min(1),
  consentType: z.string().trim().min(1).max(80),
  isGranted: z.boolean().optional(),
  signedAt: z.string().datetime().optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
});

export const consentUpdateSchema = z.object({
  consentType: z.string().trim().min(1).max(80).optional(),
  isGranted: z.boolean().optional(),
  signedAt: z.string().datetime().optional().nullable(),
  documentUrl: z.string().url().max(2048).optional().nullable(),
});

/** Consent types every patient must sign (digital intake). */
export const REQUIRED_PATIENT_CONSENT_TYPES = ["treatment", "data_usage", "hipaa"] as const;

export type RequiredPatientConsentType = (typeof REQUIRED_PATIENT_CONSENT_TYPES)[number];

export const patientConsentSignSchema = z.object({
  consentType: z.enum(REQUIRED_PATIENT_CONSENT_TYPES),
  isGranted: z.boolean(),
});

export const auditListQuerySchema = z.object({
  entityType: z.string().max(80).optional().nullable(),
  entityId: z.string().max(80).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const reportsMonthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .nullable(),
});
