import { z } from "zod";

export const waitlistCreateSchema = z.object({
  patientId: z.string().min(1),
  preferredDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const waitlistUpdateSchema = z.object({
  status: z.enum(["waiting", "offered", "cancelled", "booked"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  preferredDate: z.string().datetime().optional().nullable(),
});

export const waitlistBookSchema = z.object({
  providerId: z.string().min(1).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional().nullable(),
  roomId: z.string().min(1).max(100).optional().nullable(),
});

export const queueActionSchema = z.object({
  action: z.enum(["call-next", "complete", "no-show"]),
  appointmentId: z.string().min(1).max(100).optional().nullable(),
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
  expiryDate: z.string().datetime().optional().nullable(),
  batchNumber: z.string().trim().max(80).optional().nullable(),
});

export const inventoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sku: z.string().max(80).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  reorderLevel: z.number().int().min(0).optional().nullable(),
  unit: z.string().max(40).optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  batchNumber: z.string().trim().max(80).optional().nullable(),
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

export const taskUpdateSchema = z
  .object({
    status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
    assigneeId: z.string().min(1).max(100).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No fields to update",
  });

export const inventoryTransactionSchema = z.object({
  type: z.enum(["restock", "usage", "adjustment"]),
  quantity: z.number().int().min(1).max(1_000_000),
  reason: z.string().trim().max(2000).optional().nullable(),
});

export const availabilityUpdateSchema = z.object({
  availabilityType: z.enum(["regular", "oncall", "by_appointment"]).optional(),
  availableDays: z
    .array(z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]))
    .max(7)
    .optional(),
  availableFrom: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  availableTo: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
});

export const reportsMonthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .nullable(),
});

export const EQUIPMENT_STATUSES = [
  "active",
  "inactive",
  "maintenance_required",
] as const;

export const EQUIPMENT_TYPES = [
  "device",
  "instrument",
  "furniture",
  "vehicle",
  "other",
] as const;

export const equipmentCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(EQUIPMENT_TYPES).optional().nullable(),
  status: z.enum(EQUIPMENT_STATUSES).default("active"),
  lastCalibrationAt: z.string().datetime().optional().nullable(),
  nextCalibrationAt: z.string().datetime().optional().nullable(),
});

export const maintenanceCreateSchema = z.object({
  type: z.enum(["preventive", "repair", "calibration", "inspection"]).default("preventive"),
  status: z.enum(["scheduled", "in_progress", "completed", "overdue"]).default("completed"),
  description: z.string().trim().max(4000).optional().nullable(),
  technician: z.string().trim().max(200).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  performedAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  cost: z.number().finite().nonnegative().optional().nullable(),
});
