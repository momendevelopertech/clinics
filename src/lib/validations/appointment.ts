import { z } from "zod";

export const appointmentCreateSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  providerId: z.string().min(1, "Provider is required"),
  roomId: z.string().optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  bufferMinutes: z.number().int().min(0).max(120).optional().nullable(),
  appointmentType: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  idempotencyKey: z.string().max(100).optional().nullable(),
});

export const appointmentUpdateSchema = z.object({
  patientId: z.string().optional(),
  providerId: z.string().optional(),
  roomId: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional().nullable(),
  appointmentType: z.string().max(100).optional().nullable(),
  status: z.enum(["scheduled", "arrived", "in_progress", "completed", "cancelled", "no_show"]).optional(),
  isWalkIn: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;
