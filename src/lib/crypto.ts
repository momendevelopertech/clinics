import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export class EncryptionKeyUnavailableError extends Error {
  constructor() {
    super("ENCRYPTION_KEY is required for this operation");
    this.name = "EncryptionKeyUnavailableError";
  }
}

export class EncryptionPayloadInvalidError extends Error {
  constructor() {
    super("Encrypted payload could not be decrypted");
    this.name = "EncryptionPayloadInvalidError";
  }
}

function getEncryptionKeyBuffer() {
  const configuredKey = process.env.ENCRYPTION_KEY?.trim();
  if (!configuredKey) {
    if (process.env.NODE_ENV === "production") {
      throw new EncryptionKeyUnavailableError();
    }
    return null;
  }

  return createHash("sha256").update(configuredKey).digest();
}

export function isEncryptionEnabled() {
  return Boolean(getEncryptionKeyBuffer());
}

export function encryptJson(value: unknown) {
  const key = getEncryptionKeyBuffer();
  if (!key) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
}

export function encryptJsonStrict(value: unknown) {
  const payload = encryptJson(value);
  if (!payload) {
    throw new EncryptionKeyUnavailableError();
  }

  return payload;
}

export function decryptJson<T>(payload: string | null | undefined): T | null {
  const key = getEncryptionKeyBuffer();
  if (!payload || !key) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as {
      iv: string;
      authTag: string;
      ciphertext: string;
    };

    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(parsed.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(parsed.authTag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.ciphertext, "base64")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function decryptJsonStrict<T>(payload: string | null | undefined): T | null {
  if (!payload) {
    return null;
  }

  const key = getEncryptionKeyBuffer();
  if (!key) {
    throw new EncryptionKeyUnavailableError();
  }

  try {
    const parsed = JSON.parse(payload) as {
      iv: string;
      authTag: string;
      ciphertext: string;
    };

    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(parsed.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(parsed.authTag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.ciphertext, "base64")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    throw new EncryptionPayloadInvalidError();
  }
}
