/**
 * Production boot checks. Fail loudly so a misconfigured deploy never serves PHI.
 * Dev/test remain permissive so local work and unit tests can omit secrets.
 */

const PLACEHOLDER_PATTERN =
  /^(change-me|replace-with|your-|xxx+|todo|changeme|secret|placeholder)/i;

export class ProductionBootError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(
      `Refusing to start in production: missing or invalid secrets (${missing.join(", ")}). Set ENCRYPTION_KEY and NEXTAUTH_SECRET (min 32 chars, not a placeholder).`,
    );
    this.name = "ProductionBootError";
    this.missing = missing;
  }
}

function isWeakSecret(value: string | undefined, minLength: number): boolean {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < minLength) {
    return true;
  }
  return PLACEHOLDER_PATTERN.test(trimmed);
}

export type ProductionSecretsResult =
  | { ok: true }
  | { ok: false; missing: string[] };

export function inspectProductionSecrets(
  env: NodeJS.Dict<string> = process.env,
): ProductionSecretsResult {
  if (env.NODE_ENV !== "production") {
    return { ok: true };
  }

  const missing: string[] = [];
  const nextAuthSecret = env.NEXTAUTH_SECRET?.trim() || env.AUTH_SECRET?.trim();
  const encryptionKey = env.ENCRYPTION_KEY?.trim();

  if (isWeakSecret(nextAuthSecret, 32)) {
    missing.push("NEXTAUTH_SECRET");
  }
  if (isWeakSecret(encryptionKey, 32)) {
    missing.push("ENCRYPTION_KEY");
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
}

export function assertProductionSecrets(
  env: NodeJS.Dict<string> = process.env,
): void {
  const result = inspectProductionSecrets(env);
  if (!result.ok) {
    throw new ProductionBootError(result.missing);
  }
}
