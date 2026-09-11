import { z } from "zod";

export const invoiceLineItemSchema = z.object({
  serviceCatalogId: z.string().min(1).optional().nullable(),
  description: z.string().trim().max(200).optional(),
  quantity: z.number().int().positive().max(100000),
  unitPrice: z.number().finite().nonnegative().optional(),
  discountAmount: z.number().finite().nonnegative().default(0),
  taxAmount: z.number().finite().nonnegative().default(0),
  cptCode: z.string().max(40).optional().nullable(),
});

export const invoiceCreateSchema = z.object({
  patientId: z.string().min(1),
  dueDate: z.string().date().optional().nullable(),
  idempotencyKey: z.string().max(100).optional().nullable(),
  lineItems: z.array(invoiceLineItemSchema).min(1),
});

export const paymentMethodSchema = z.enum([
  "card",
  "online",
  "cash",
  "transfer",
  "check",
  "insurance",
]);

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default("usd"),
  description: z.string().max(200).optional(),
  method: paymentMethodSchema.default("card"),
});

export const paymentRefundSchema = z.object({
  amount: z.number().positive().optional().nullable(),
});

export const insurancePolicySchema = z.object({
  patientId: z.string().min(1),
  provider: z.string().trim().min(1).max(160),
  policyNumber: z.string().trim().min(1).max(80),
  groupNumber: z.string().trim().max(80).optional().nullable(),
  type: z.enum(["primary", "secondary"]).default("primary"),
});

export const insuranceClaimSchema = z.object({
  patientId: z.string().min(1),
  invoiceId: z.string().min(1).optional().nullable(),
  amountClaimed: z.number().finite().positive(),
});

export const insuranceClaimUpdateSchema = z.object({
  status: z.enum(["submitted", "pending", "paid", "denied", "appeal"]),
  amountPaid: z.number().finite().nonnegative().optional().nullable(),
  denialReason: z.string().trim().max(1000).optional().nullable(),
});
