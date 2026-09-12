import { createHmac } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/crypto";
import { logServerError } from "@/lib/safe-logger";

/**
 * Outgoing webhook delivery for integration events.
 *
 * Signing: each webhook's raw secret is encrypted at rest (AES-GCM via
 * `encryptJson`); deliveries carry `x-webhook-signature: sha256=…` computed
 * over the raw payload so consumers can verify authenticity without seeing
 * the secret.
 *
 * Delivery: up to 3 attempts with backoff (0ms / 2s / 8s). Every attempt is
 * recorded on WebhookDelivery so delivery health is auditable.
 */

export type WebhookEvent =
  | "patient.created"
  | "patient.updated"
  | "observation.created"
  | "appointment.created";

const RETRY_DELAYS_MS = [0, 2000, 8000];

export function signWebhookPayload(secret: string, rawPayload: string): string {
  const hmac = createHmac("sha256", secret).update(rawPayload).digest("hex");
  return `sha256=${hmac}`;
}

function asJsonValue(payload: unknown): Prisma.InputJsonValue {
  return payload as Prisma.InputJsonValue;
}

async function fire(
  webhook: { id: string; url: string; secretHash: string | null },
  event: string,
  payload: unknown,
): Promise<void> {
  const raw = JSON.stringify(payload);
  const secret = webhook.secretHash
    ? (decryptJson<{ secret: string }>(webhook.secretHash)?.secret ?? null)
    : null;
  const signature = secret ? signWebhookPayload(secret, raw) : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "OpenHealthCRM-Webhook/1.0",
    "X-Webhook-Event": event,
  };
  if (signature) headers["X-Webhook-Signature"] = signature;

  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = RETRY_DELAYS_MS[attempt - 1];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: raw,
        signal: AbortSignal.timeout(10_000),
      });
      const body = await res.text().catch(() => "");
      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventType: event,
          attempt,
          status: res.ok ? "delivered" : "failed",
          payload: asJsonValue(payload),
          responseStatus: res.status,
          responseBody: body.slice(0, 2000),
          deliveredAt: res.ok ? new Date() : null,
        },
      });
      if (res.ok) return;
      if (attempt === RETRY_DELAYS_MS.length) {
        logServerError("Webhook delivery exhausted retries", {
          webhookId: webhook.id,
          url: webhook.url,
          status: res.status,
        });
      }
    } catch (error) {
      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventType: event,
          attempt,
          status: "failed",
          payload: asJsonValue(payload),
          error: error instanceof Error ? error.message : String(error),
        },
      });
      if (attempt === RETRY_DELAYS_MS.length) {
        logServerError("Webhook delivery failed", error);
      }
    }
  }
}

/** Fires the event to every active webhook subscribed to it (best-effort). */
export async function deliverWebhook(
  organizationId: string,
  event: WebhookEvent,
  payload: unknown,
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { organizationId, active: true },
      select: { id: true, url: true, secretHash: true, eventTypes: true },
    });
    const matching = webhooks.filter((webhook) => {
      try {
        const types = JSON.parse(webhook.eventTypes) as string[];
        return Array.isArray(types) && types.includes(event);
      } catch {
        return false;
      }
    });
    await Promise.allSettled(
      matching.map((webhook) => fire(webhook, event, payload)),
    );
  } catch (error) {
    logServerError("deliverWebhook failed", error);
  }
}