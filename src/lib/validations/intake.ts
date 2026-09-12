import { z } from "zod";

export const intakeFormCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
});

export const intakeFormUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  active: z.boolean().optional(),
});

export const intakeFieldCreateSchema = z.object({
  label: z.string().trim().min(1).max(200),
  labelAr: z.string().trim().max(200).optional().nullable(),
  kind: z.enum(["text", "multiline", "number", "date", "boolean", "choice"]).default("text"),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(120)).max(30).optional().nullable(),
});

export const intakeResponseSchema = z.object({
  formId: z.string().min(1),
  appointmentId: z.string().min(1).max(100).optional().nullable(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
