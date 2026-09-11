import { z } from "zod";

export const organizationSettingsSchema = z.object({
  appointmentDurationMins: z.number().int().positive().max(480).default(30),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  currency: z.string().length(3).default("USD"),
  defaultTaxRate: z.number().min(0).max(100).default(0),
  invoicePrefix: z.string().trim().min(1).max(20).default("INV-"),
  appointmentReminders: z.boolean().default(true),
  reminderConfig: z
    .object({
      enabled24h: z.boolean().optional(),
      enabled1h: z.boolean().optional(),
      channels: z
        .object({
          sms: z.boolean().optional(),
          whatsapp: z.boolean().optional(),
          email: z.boolean().optional(),
        })
        .optional(),
      quietStart: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional()
        .nullable(),
      quietEnd: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional()
        .nullable(),
    })
    .optional()
    .default({}),
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
  cancellationPolicy: z
    .object({
      lateCancelHoursBefore: z.number().int().min(1).max(168).optional(),
      maxNoShows: z.number().int().min(1).max(20).optional(),
      noShowFee: z.number().min(0).max(100000).optional(),
    })
    .optional()
    .default({}),
});
