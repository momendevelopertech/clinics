import { z } from "zod";

const statusSchema = z.enum(["active", "inactive"]);
const workingHoursSchema = z.string().max(5_000).optional().nullable();

export const branchCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  zip: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  status: statusSchema.optional(),
  workingHours: workingHoursSchema,
});

export const branchUpdateSchema = branchCreateSchema.partial();

export const roomCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  number: z.string().trim().max(50).optional().nullable(),
  type: z.string().trim().max(100).optional().nullable(),
  branchId: z.string().trim().min(1).optional().nullable(),
  status: statusSchema.optional(),
  workingHours: workingHoursSchema,
});

export const roomUpdateSchema = roomCreateSchema.partial();
