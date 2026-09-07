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

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default("usd"),
  description: z.string().max(200).optional(),
});
