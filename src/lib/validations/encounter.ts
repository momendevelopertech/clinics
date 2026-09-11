import { z } from "zod";

export const soapNoteSchema = z.object({
  subjective: z.string().max(5000).optional().nullable(),
  objective: z.string().max(5000).optional().nullable(),
  assessment: z.string().max(5000).optional().nullable(),
  plan: z.string().max(5000).optional().nullable(),
});

export const encounterCreateSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().min(1).optional().nullable(),
  encounterType: z.string().max(80).optional().nullable(),
});

export const encounterUpdateSchema = z.object({
  status: z.enum(["in_progress", "completed"]).optional(),
});

export const vitalSchema = z.object({
  weightKg: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  bloodPressureSystolic: z.number().int().min(0).max(300).optional().nullable(),
  bloodPressureDiastolic: z.number().int().min(0).max(200).optional().nullable(),
  heartRate: z.number().int().min(0).max(300).optional().nullable(),
  bmi: z.number().positive().optional().nullable(),
  spO2: z.number().int().min(0).max(100).optional().nullable(),
  temperature: z.number().min(30).max(45).optional().nullable(),
});

export const prescriptionSchema = z.object({
  medicationName: z.string().min(1, "Medication name is required"),
  dosage: z.string().max(200).optional().nullable(),
  frequency: z.string().max(100).optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  instructions: z.string().max(1000).optional().nullable(),
  idempotencyKey: z.string().max(100).optional().nullable(),
});

export const prescriptionItemSchema = prescriptionSchema.omit({ idempotencyKey: true });
export const diagnosisSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().min(1).optional().nullable(),
  system: z.string().trim().min(1).max(80),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "resolved"]).optional(),
});
export const followUpSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().min(1).optional().nullable(),
  dueDate: z.string().date(),
  reason: z.string().trim().min(1).max(200),
  instructions: z.string().max(1000).optional().nullable(),
});

export type SoapNoteInput = z.infer<typeof soapNoteSchema>;
export type VitalInput = z.infer<typeof vitalSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

export const clinicalTemplateCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  specialty: z.string().trim().max(120).optional().nullable(),
  noteType: z.string().trim().max(40).default("soap"),
  subjective: z.string().max(5000).optional().nullable(),
  objective: z.string().max(5000).optional().nullable(),
  assessment: z.string().max(5000).optional().nullable(),
  plan: z.string().max(5000).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const clinicalTemplateUpdateSchema = clinicalTemplateCreateSchema.partial();
