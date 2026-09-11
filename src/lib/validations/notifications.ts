import { z } from "zod";

export const notificationCreateSchema = z.object({
  recipientId: z.string().min(1),
  channel: z.enum(["in_app", "email", "sms"]).default("in_app"),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  entityType: z.string().max(80).optional().nullable(),
  entityId: z.string().max(100).optional().nullable(),
});

export const notificationStatusSchema = z.object({
  status: z.enum(["read", "unread"]),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(512),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});
