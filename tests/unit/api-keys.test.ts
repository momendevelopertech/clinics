import { describe, expect, it } from "vitest";
import {
  mintApiKey,
  extractBearerToken,
  extractApiKeyPrefix,
} from "@/lib/api-keys";

describe("API key minting helpers", () => {
  it("mints a prefixed key whose hash never contains the raw secret", () => {
    const minted = mintApiKey("integrations", ["fhir:write"]);
    expect(minted.fullKey.startsWith("crm_live_")).toBe(true);
    expect(minted.prefix).toBe(minted.fullKey.slice(0, 16));
    expect(minted.keyHash).not.toContain(minted.fullKey);
    expect(minted.keyHash).toHaveLength(64);
    expect(minted.scopes).toEqual(["fhir:write"]);
  });

  it("mints unique keys per call", () => {
    const a = mintApiKey("integration");
    const b = mintApiKey("integration");
    expect(a.fullKey).not.toBe(b.fullKey);
    expect(a.keyHash).not.toBe(b.keyHash);
  });

  it("extracts a bearer token case-insensitively", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
  });

  it("returns the exact 16-char lookup prefix", () => {
    const minted = mintApiKey("integration", []);
    expect(extractApiKeyPrefix(minted.fullKey)).toBe(minted.prefix);
    expect(minted.prefix).toHaveLength(16);
  });
});

describe("authenticateApiKey", () => {
  it("rejects when the bearer does not use the CRM prefix", async () => {
    const auth = await import("@/lib/api-keys");
    const result = await auth.authenticateApiKey("org_x", "Bearer other");
    expect(result).toEqual({ ok: false });
  });
});