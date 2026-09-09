import { z } from "zod";

export const planCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Plan code is required")
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-_]*$/, "Code must be lowercase alphanumeric"),
  internalCode: z.string().trim().max(40).optional().nullable(),
  nameEn: z.string().trim().min(1, "English name is required").max(80),
  nameAr: z.string().trim().min(1, "Arabic name is required").max(80),
  descriptionEn: z.string().trim().max(500).default(""),
  descriptionAr: z.string().trim().max(500).default(""),
  price: z.coerce.number().min(0).default(0),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  status: z.enum(["active", "archived"]).default("active"),
  displayOrder: z.coerce.number().int().min(0).default(0),
  popular: z.boolean().default(false),
  trialDays: z.coerce.number().int().min(0).max(365).default(0),
  modulesJson: z.string().optional().nullable(),
  featuresJson: z.string().optional().nullable(),
  upgradeTargetId: z.string().optional().nullable(),
  downgradeTargetIdsJson: z.string().default("[]"),
  downgradesAllowed: z.boolean().default(true),
});

export const planUpdateSchema = planCreateSchema.partial();

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

export const overrideCreateSchema = z.object({
  moduleKey: z.string().trim().min(1).optional().nullable(),
  featureKey: z.string().trim().min(1).optional().nullable(),
  kind: z.enum(["module_override", "feature_override", "limit_override"]),
  valueJson: z.string().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
}).refine((v) => v.moduleKey || v.featureKey, {
  message: "moduleKey or featureKey is required",
});

export type OverrideCreateInput = z.infer<typeof overrideCreateSchema>;