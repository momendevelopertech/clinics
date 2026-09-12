import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { signWebhookPayload } from "@/lib/webhook-delivery";

describe("webhook payload signing", () => {
  it("produces a stable, verifiable sha256 HMAC header", () => {
    const secret = "whsec_test_secret_123";
    const raw = JSON.stringify({ event: "patient.created", patientId: "p1" });
    const signature = signWebhookPayload(secret, raw);
    const [algo, digest] = signature.split("=");
    expect(algo).toBe("sha256");
    expect(digest).toHaveLength(64);
  });

  it("produces different signatures for different payloads", () => {
    const secret = "whsec_test_secret_123";
    const a = signWebhookPayload(secret, JSON.stringify({ n: 1 }));
    const b = signWebhookPayload(secret, JSON.stringify({ n: 2 }));
    expect(a).not.toBe(b);
  });

  it("produces signatures that consumers can recompute from the same inputs", () => {
    const secret = "whsec_test_secret_123";
    const raw = "payload-bytes";
    const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    expect(signWebhookPayload(secret, raw)).toBe(expected);
  });
});