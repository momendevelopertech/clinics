import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Short-lived signed download tokens for sensitive documents.
 *
 * "Explicit file encryption": even though the file bytes live behind a
 * provider-managed bucket (Cloudinary), the CRM never hands out a raw
 * storage URL to the browser — a viewer must hold a bearer-style token that
 * is HMAC-signed with ENCRYPTION_KEY and expires after DOCUMENT_TOKEN_TTL_MS.
 *
 * Pure functions so the signing contract is unit-tested.
 */

const DEFAULT_TTL_MS = Number(process.env.DOCUMENT_TOKEN_TTL_MS ?? 60 * 5) * 1000;

export type SignedTokenPayload = {
  orgId: string;
  documentId: string;
};

function signingKey(): Buffer {
  const configuredKey = process.env.ENCRYPTION_KEY?.trim();
  if (!configuredKey) {
    throw new Error("ENCRYPTION_KEY is required to sign document download tokens");
  }
  return createHash("sha256").update(`document-download:${configuredKey}`).digest();
}

export function mintDocumentDownloadToken(
  payload: SignedTokenPayload,
  now: number = Date.now(),
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const expires = now + ttlMs;
  const body = `${payload.orgId}.${payload.documentId}.${expires}`;
  const sig = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { ok: true; orgId: string; documentId: string }
  | { ok: false; reason: "bad_token" | "expired" };

export function verifyDocumentDownloadToken(
  token: string,
  now: number = Date.now(),
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 4) {
    return { ok: false, reason: "bad_token" };
  }
  const [orgId, documentId, expiresRaw, sig] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires <= 0) {
    return { ok: false, reason: "bad_token" };
  }
  const expected = createHmac("sha256", signingKey())
    .update(`${orgId}.${documentId}.${expires}`)
    .digest("base64url");
  let sigBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, "base64url");
    expectedBuf = Buffer.from(expected, "base64url");
  } catch {
    return { ok: false, reason: "bad_token" };
  }
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, reason: "bad_token" };
  }
  if (now > expires) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, orgId, documentId };
}