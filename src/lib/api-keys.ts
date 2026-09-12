import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

/** API keys for machine integrations (FHIR write-back etc.). */
const KEY_PREFIX = "crm_live_";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Generates a key that is shown to the caller exactly once. The key is
 * stored as a SHA-256 hash + a prefix used for O(1) lookup, so a DB leak
 * never exposes usable secrets.
 */
export function mintApiKey(name: string, scopes: string[] = ["fhir:write"]) {
  const raw = randomBytes(24).toString("base64url");
  const fullKey = `${KEY_PREFIX}${raw}`;
  const prefix = fullKey.slice(0, 16);
  return {
    fullKey,
    prefix,
    keyHash: sha256(fullKey),
    scopes,
  };
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1] ?? null;
}

export function extractApiKeyPrefix(fullKey: string): string {
  return fullKey.slice(0, 16);
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

export type ApiKeyAuthResult =
  | { ok: true; apiKeyId: string; scopes: string[] }
  | { ok: false };

/**
 * Authenticates a request via `Authorization: Bearer <apiKey>` scoped to an
 * organization. Any valid key grants `fhir:write` integrations regardless of
 * the RBAC identity layer — machine access is deliberately distinct.
 */
export async function authenticateApiKey(
  organizationId: string,
  bearer: string | null,
): Promise<ApiKeyAuthResult> {
  if (!bearer || !bearer.startsWith(KEY_PREFIX)) {
    return { ok: false };
  }
  const prefix = extractApiKeyPrefix(bearer);
  const record = await prisma.apiKey.findFirst({
    where: { organizationId, prefix, active: true },
    select: { id: true, keyHash: true, scopes: true },
  });
  if (!record || !constantTimeEqual(record.keyHash, sha256(bearer))) {
    return { ok: false };
  }
  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });
  try {
    const scopes = JSON.parse(record.scopes) as string[];
    return { ok: true, apiKeyId: record.id, scopes: Array.isArray(scopes) ? scopes : [] };
  } catch {
    return { ok: true, apiKeyId: record.id, scopes: [] };
  }
}