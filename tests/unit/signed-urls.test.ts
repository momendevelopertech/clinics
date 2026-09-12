import { describe, expect, it, beforeEach } from "vitest";
import {
  mintDocumentDownloadToken,
  verifyDocumentDownloadToken,
} from "@/lib/signed-urls";

const TEST_KEY = "unit-test-encryption-key";

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe("signed document download tokens", () => {
  it("mints a token that verifies and round-trips the payload", () => {
    const token = mintDocumentDownloadToken(
      { orgId: "org_1", documentId: "doc_9" },
      1_000_000,
      // Use the injected TTL so the expiry math is explicit.
      60_000,
    );
    const result = verifyDocumentDownloadToken(token, 1_030_000);
    expect(result).toEqual({ ok: true, orgId: "org_1", documentId: "doc_9" });
  });

  it("rejects tokens past their TTL as expired", () => {
    const token = mintDocumentDownloadToken(
      { orgId: "org_1", documentId: "doc_9" },
      1_000_000,
      60_000,
    );
    const result = verifyDocumentDownloadToken(token, 1_100_000);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects tampered payloads", () => {
    const token = mintDocumentDownloadToken(
      { orgId: "org_1", documentId: "doc_9" },
      1_000_000,
      60_000,
    );
    const parts = token.split(".");
    parts[1] = "doc_10";
    const tampered = parts.join(".");
    expect(verifyDocumentDownloadToken(tampered, 1_030_000)).toEqual({
      ok: false,
      reason: "bad_token",
    });
  });

  it("rejects malformed and empty tokens", () => {
    expect(verifyDocumentDownloadToken("", 1_030_000)).toEqual({
      ok: false,
      reason: "bad_token",
    });
    expect(verifyDocumentDownloadToken("a.b.c", 1_030_000)).toEqual({
      ok: false,
      reason: "bad_token",
    });
  });
});