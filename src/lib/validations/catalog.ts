import { z } from "zod";

export const serviceCatalogSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  durationMins: z.number().int().positive().max(1440).optional().nullable(),
  price: z.number().finite().nonnegative().max(100000000),
  active: z.boolean().optional(),
});

export const clinicalCatalogSchema = z.object({
  system: z.string().trim().min(1).max(80),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional(),
});
