import { z } from "zod";

export const organizationSettingsSchema = z.object({
  appointmentDurationMins: z.number().int().positive().max(480).default(30),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  currency: z.string().length(3).default("USD"),
  defaultTaxRate: z.number().min(0).max(100).default(0),
  invoicePrefix: z.string().trim().min(1).max(20).default("INV-"),
  appointmentReminders: z.boolean().default(true),
  newPatientAlerts: z.boolean().default(true),
  billingNotifications: z.boolean().default(true),
  clinicLogoUrl: z
    .string()
    .url()
    .refine((url) => /^https:\/\//i.test(url), "Logo URL must be HTTPS")
    .or(z.literal(""))
    .optional()
    .default(""),
  clinicLogoPublicId: z.string().trim().max(500).optional().nullable().default(null),
});
