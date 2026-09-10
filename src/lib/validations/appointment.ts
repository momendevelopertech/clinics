import { z } from "zod";

const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointmentCreateSchema = z
  .object({
    patientId: z.string().min(1, "Patient is required"),
    providerId: z.string().min(1).optional().nullable(),
    roomId: z.string().optional().nullable(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    date: z.string().min(1).optional(),
    time: z.string().min(1).optional(),
    bufferMinutes: z.number().int().min(0).max(120).optional().nullable(),
    appointmentType: z.string().max(100).optional().nullable(),
    type: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    idempotencyKey: z.string().max(100).optional().nullable(),
    status: appointmentStatusSchema.optional(),
    isWalkIn: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const hasIso = Boolean(value.startTime && value.endTime);
    const hasParts = Boolean(value.date && value.time);
    if (!hasIso && !hasParts) {
      ctx.addIssue({
        code: "custom",
        message: "Either (date + time) or (startTime + endTime) required",
      });
    }
  });

export const appointmentUpdateSchema = z.object({
  patientId: z.string().optional(),
  providerId: z.string().optional(),
  roomId: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional().nullable(),
  appointmentType: z.string().max(100).optional().nullable(),
  status: appointmentStatusSchema.optional(),
  isWalkIn: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;
