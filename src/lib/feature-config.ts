/**
 * Config-gated (environment-dependent) features.
 *
 * Pure, node-safe helpers — no `process.env` access inside the predicates
 * except through the injected `env` record, so unit tests can pass fake envs.
 * The API route `/api/config/status` evaluates these against the real env
 * and the client only ever sees booleans + missing variable *names*
 * (never secret values).
 */

export type ConfigGatedFeature =
  | "ai"
  | "fhir"
  | "twilio"
  | "cloudinary"
  | "stripe"
  | "email";

export const CONFIG_GATED_FEATURES: readonly ConfigGatedFeature[] = [
  "ai",
  "fhir",
  "twilio",
  "cloudinary",
  "stripe",
  "email",
];

export type EnvRecord = Record<string, string | undefined>;

export type FeatureConfigStatus = {
  feature: ConfigGatedFeature;
  configured: boolean;
  /** Names of the env vars that are still missing (safe to expose). */
  missing: string[];
  /**
   * Set when the feature degrades to a dev fallback instead of failing
   * (email `console` provider only logs instead of delivering).
   */
  devFallback?: boolean;
};

function blank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function missingOf(env: EnvRecord, names: string[]): string[] {
  return names.filter((name) => blank(env[name]));
}

export function getFeatureConfigStatus(
  feature: ConfigGatedFeature,
  env: EnvRecord = process.env,
): FeatureConfigStatus {
  switch (feature) {
    case "ai": {
      const provider = (env.AI_PROVIDER ?? "none").toLowerCase();
      const missing: string[] = [];
      if (provider !== "openai" && provider !== "anthropic") {
        missing.push("AI_PROVIDER");
      }
      if (blank(env.AI_API_KEY)) missing.push("AI_API_KEY");
      return { feature, configured: missing.length === 0, missing };
    }
    case "fhir": {
      const missing = missingOf(env, ["FHIR_BASE_URL"]);
      return { feature, configured: missing.length === 0, missing };
    }
    case "twilio": {
      const missing = missingOf(env, [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_PHONE_NUMBER",
        "TWILIO_WHATSAPP_NUMBER",
      ]);
      return { feature, configured: missing.length === 0, missing };
    }
    case "cloudinary": {
      const missing = missingOf(env, [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ]);
      return { feature, configured: missing.length === 0, missing };
    }
    case "stripe": {
      const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
      const missing =
        key.length === 0 || key === "sk_test_dummy" ? ["STRIPE_SECRET_KEY"] : [];
      return { feature, configured: missing.length === 0, missing };
    }
    case "email": {
      const provider = (env.EMAIL_PROVIDER ?? "console").trim().toLowerCase();
      if (provider === "console" || provider.length === 0) {
        return {
          feature,
          configured: false,
          missing: ["EMAIL_PROVIDER"],
          devFallback: true,
        };
      }
      if (provider === "smtp") {
        const missing = missingOf(env, [
          "EMAIL_HOST",
          "EMAIL_USER",
          "EMAIL_PASSWORD",
          "EMAIL_FROM",
        ]);
        return { feature, configured: missing.length === 0, missing };
      }
      if (provider === "resend") {
        const missing = missingOf(env, ["RESEND_API_KEY", "EMAIL_FROM"]);
        return { feature, configured: missing.length === 0, missing };
      }
      return { feature, configured: false, missing: ["EMAIL_PROVIDER"] };
    }
  }
}

export function getAllFeatureConfigStatuses(
  env: EnvRecord = process.env,
): Record<ConfigGatedFeature, FeatureConfigStatus> {
  return {
    ai: getFeatureConfigStatus("ai", env),
    fhir: getFeatureConfigStatus("fhir", env),
    twilio: getFeatureConfigStatus("twilio", env),
    cloudinary: getFeatureConfigStatus("cloudinary", env),
    stripe: getFeatureConfigStatus("stripe", env),
    email: getFeatureConfigStatus("email", env),
  };
}

/** Third-party setup guide links (public docs, no secrets). */
export const FEATURE_DOC_LINKS: Partial<Record<ConfigGatedFeature, string>> = {
  ai: "https://platform.openai.com/docs",
  fhir: "https://hl7.org/fhir/",
  twilio: "https://www.twilio.com/docs",
  cloudinary: "https://cloudinary.com/documentation",
  stripe: "https://stripe.com/docs",
  email: "https://resend.com/docs",
};
