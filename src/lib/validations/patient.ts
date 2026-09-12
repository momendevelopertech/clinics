import { z } from "zod";

export const patientCreateSchema = z.object({
  mrn: z.string().trim().regex(/^MRN-[A-Z0-9-]+$/i).max(40).optional().nullable(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  phoneSecondary: z.string().max(20).optional().nullable(),
  marketingOptOut: z.boolean().optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  bloodType: z.string().max(10).optional().nullable(),
  allergies: z.string().max(500).optional().nullable(),
  primaryCareProvider: z.string().max(200).optional().nullable(),
  familyHistory: z.string().optional().nullable(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
  emergencyContactRelationship: z.string().max(50).optional().nullable(),
  status: z.enum(["Active", "Inactive", "Archived"]).optional(),
});

export const patientUpdateSchema = patientCreateSchema.partial();

export const patientListQuerySchema = z.object({
  q: z.string().trim().max(100).optional().nullable(),
  status: z.enum(["Active", "Inactive", "Archived"]).optional().nullable(),
  page: z.coerce.number().int().min(1).max(1000).optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().nullable(),
});

export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

export const patientMergeSchema = z.object({
  survivorId: z.string().min(1).max(100),
});

export const patientHistorySchema = z.object({
  category: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(160),
  details: z.string().trim().max(4000).optional().nullable(),
  onsetDate: z.string().date().optional().nullable(),
  resolvedAt: z.string().date().optional().nullable(),
  status: z.enum(["active", "resolved"]).default("active"),
});

export const patientAllergyCreateSchema = z.object({
  allergen: z.string().trim().min(1).max(200),
  severity: z.enum(["mild", "moderate", "severe"]).optional().nullable(),
  reaction: z.string().trim().max(500).optional().nullable(),
  onset: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

export const patientAllergyUpdateSchema = patientAllergyCreateSchema.partial();

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
