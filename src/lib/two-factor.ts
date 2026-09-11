import { createHash, randomBytes } from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import { decryptJsonStrict, encryptJsonStrict } from "@/lib/crypto";

const ISSUER = "OpenHealthCRM";
const BACKUP_CODE_COUNT = 8;

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpAuthUrl(secret: string, accountEmail: string): string {
  return generateURI({ issuer: ISSUER, label: accountEmail, secret });
}

export function encryptTotpSecret(secret: string): string {
  return encryptJsonStrict({ secret });
}

export function decryptTotpSecret(payload: string | null | undefined): string | null {
  try {
    const data = decryptJsonStrict<{ secret?: unknown }>(payload);
    return typeof data?.secret === "string" ? data.secret : null;
  } catch {
    // Tampered/undecryptable secret fails closed as "no usable secret".
    return null;
  }
}

export function verifyTotpToken(secret: string, token: string): boolean {
  const clean = token.replace(/[\s-]/g, "");
  if (!/^\d{6,8}$/.test(clean)) return false;
  try {
    // ±30s clock skew tolerated (one TOTP step each side).
    return verifySync({ secret, token: clean, epochTolerance: 30 }).valid === true;
  } catch {
    return false;
  }
}

function newBackupCode(): string {
  return randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})(.{5})/, "$1-$2");
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}

/** Generates single-use recovery codes; returns plaintext (show once) + hashes (store). */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): {
  plain: string[];
  hashes: string[];
} {
  const plain = Array.from({ length: count }, newBackupCode);
  return { plain, hashes: plain.map(hashBackupCode) };
}

export function parseBackupHashes(payload: string | null | undefined): string[] {
  if (!payload) return [];
  try {
    const arr = JSON.parse(payload) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Single-use: returns remaining hashes after consuming a valid code, else null. */
export function consumeBackupCode(
  storedHashes: string[],
  candidate: string,
): string[] | null {
  const hash = hashBackupCode(candidate);
  const idx = storedHashes.indexOf(hash);
  if (idx === -1) return null;
  return [...storedHashes.slice(0, idx), ...storedHashes.slice(idx + 1)];
}
