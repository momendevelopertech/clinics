import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EncryptionKeyUnavailableError,
  decryptJson,
  decryptJsonStrict,
  encryptJson,
  encryptJsonStrict,
  isEncryptionEnabled,
} from "../../src/lib/crypto";
import { buildEncryptedPatientFields } from "@/lib/patient-sensitive";

// F3 production hardening: a missing ENCRYPTION_KEY must fail closed in
// production (no silent plaintext fallback) while leaving the dev/demo
// behavior unchanged.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("crypto fail-closed in production", () => {
  it("throws when ENCRYPTION_KEY is missing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", "");

    expect(() => isEncryptionEnabled()).toThrow(EncryptionKeyUnavailableError);
    expect(() => encryptJson({ health: "sensitive" })).toThrow(
      EncryptionKeyUnavailableError,
    );
    expect(() => encryptJsonStrict({ health: "sensitive" })).toThrow(
      EncryptionKeyUnavailableError,
    );
    expect(() => decryptJson("payload")).toThrow(EncryptionKeyUnavailableError);
    expect(() => decryptJsonStrict("payload")).toThrow(
      EncryptionKeyUnavailableError,
    );
  });

  it("prevents the plaintext fallback in production via patient-sensitive", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", "");

    expect(() =>
      buildEncryptedPatientFields({ dateOfBirth: "1996-06-14" }),
    ).toThrow(EncryptionKeyUnavailableError);
  });

  it("round-trips when the key is present in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", "prod-secret-key");

    const encrypted = encryptJsonStrict({ phoneSecondary: "12345" });
    expect(encrypted).not.toBeNull();
    expect(decryptJsonStrict(encrypted)).toEqual({ phoneSecondary: "12345" });
  });
});

describe("crypto dev/demo behavior stays permissive", () => {
  it("returns null without the key outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENCRYPTION_KEY", "");

    expect(isEncryptionEnabled()).toBe(false);
    expect(encryptJson({ a: 1 })).toBeNull();
    expect(decryptJson(null)).toBeNull();
  });
});