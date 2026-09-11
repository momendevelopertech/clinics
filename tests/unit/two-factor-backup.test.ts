import { describe, expect, it, vi } from "vitest";
import { generateSync } from "otplib";
import {
  consumeBackupCode,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  parseBackupHashes,
  totpAuthUrl,
  verifyTotpToken,
  decryptTotpSecret,
  encryptTotpSecret,
} from "@/lib/two-factor";
import { buildOrgSnapshot, verifySnapshotChecksum, EXPORT_TABLES } from "@/lib/org-export";

vi.stubEnv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

describe("two-factor", () => {
  it("verifies a current TOTP code and rejects wrong ones", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret });
    expect(verifyTotpToken(secret, token)).toBe(true);
    expect(verifyTotpToken(secret, "000000")).toBe(false);
    expect(verifyTotpToken(secret, "not-a-code")).toBe(false);
  });

  it("round-trips the secret through encryption", () => {
    const secret = generateTotpSecret();
    expect(decryptTotpSecret(encryptTotpSecret(secret))).toBe(secret);
    expect(decryptTotpSecret(null)).toBeNull();
    expect(decryptTotpSecret("garbage")).toBeNull();
  });

  it("builds otpauth URLs", () => {
    const url = totpAuthUrl("ABCDEF", "doc@clinic.com");
    expect(url.startsWith("otpauth://totp/")).toBe(true);
  });

  it("issues single-use backup codes", () => {
    const { plain, hashes } = generateBackupCodes();
    expect(plain).toHaveLength(8);
    expect(new Set(plain).size).toBe(8);
    const remaining = consumeBackupCode(hashes, plain[0]);
    expect(remaining).not.toBeNull();
    expect(remaining!).toHaveLength(7);
    // Reuse fails.
    expect(consumeBackupCode(remaining!, plain[0])).toBeNull();
    expect(consumeBackupCode(hashes, "WRONG-CODE")).toBeNull();
    expect(hashBackupCode(plain[1])).toBe(hashes[1]);
  });

  it("parses stored hashes defensively", () => {
    expect(parseBackupHashes(null)).toEqual([]);
    expect(parseBackupHashes("broken{")).toEqual([]);
    expect(parseBackupHashes(JSON.stringify(["a", 1]))).toEqual(["a"]);
  });
});

describe("org export snapshot", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function fakeDb(rowsPerTable: number): any {
    const db: Record<string, unknown> = {};
    for (const t of EXPORT_TABLES) {
      db[t] = {
        findMany: vi.fn(async () => Array.from({ length: rowsPerTable }, (_, i) => ({ id: `${t}-${i}` }))),
        count: vi.fn(async () => rowsPerTable),
      };
    }
    return db;
  }

  it("snapshots every table with counts and a valid checksum", async () => {
    const snap = await buildOrgSnapshot(fakeDb(2), "org1");
    expect(snap.organizationId).toBe("org1");
    expect(Object.keys(snap.tables).sort()).toEqual([...EXPORT_TABLES].sort());
    expect(snap.counts.patient).toBe(2);
    expect(Object.values(snap.truncated).every((v) => v === false)).toBe(true);
    expect(verifySnapshotChecksum(snap)).toBe(true);
  });

  it("flags truncation and detects tampering", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = fakeDb(0);
    db.patient = {
      findMany: vi.fn(async () => [{ id: "p1" }]),
      count: vi.fn(async () => 6000),
    };
    const snap = await buildOrgSnapshot(db, "org1");
    expect(snap.truncated.patient).toBe(true);
    expect(verifySnapshotChecksum({ ...snap, counts: { ...snap.counts, patient: 1 } })).toBe(false);
  });
});
