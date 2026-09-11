import { z } from "zod";

export const staffProfileUpdateSchema = z.object({
  specialty: z.string().trim().max(150).optional().nullable(),
  licenseNumber: z.string().trim().max(100).optional().nullable(),
  workingHours: z.string().max(5_000).optional().nullable(),
  branchId: z.string().trim().min(1).optional().nullable(),
  roomId: z.string().trim().min(1).optional().nullable(),
  availabilityType: z.enum(["regular", "oncall", "by_appointment"]).optional().nullable(),
  availableDays: z.string().max(500).optional().nullable(),
  availableFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  availableTo: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
});

export const shiftCreateSchema = z
  .object({
    userId: z.string().min(1).max(100),
    branchId: z.string().min(1).max(100).optional().nullable(),
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .refine((v) => v.startTime < v.endTime, { message: "End time must be after start time" });
