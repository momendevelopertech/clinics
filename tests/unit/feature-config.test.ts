import { describe, expect, it } from "vitest";
import {
  CONFIG_GATED_FEATURES,
  FEATURE_DOC_LINKS,
  getAllFeatureConfigStatuses,
  getFeatureConfigStatus,
  type EnvRecord,
} from "@/lib/feature-config";

const EMPTY: EnvRecord = {};

describe("feature-config statuses", () => {
  it("reports every feature as not configured with an empty env", () => {
    for (const feature of CONFIG_GATED_FEATURES) {
      const status = getFeatureConfigStatus(feature, EMPTY);
      expect(status.configured).toBe(false);
      expect(status.missing.length).toBeGreaterThan(0);
    }
  });

  it("enables AI only with provider + key", () => {
    expect(
      getFeatureConfigStatus("ai", { AI_PROVIDER: "openai", AI_API_KEY: "k" }).configured,
    ).toBe(true);
    expect(
      getFeatureConfigStatus("ai", { AI_PROVIDER: "openai" }).missing,
    ).toContain("AI_API_KEY");
    expect(
      getFeatureConfigStatus("ai", { AI_PROVIDER: "none", AI_API_KEY: "k" }).missing,
    ).toContain("AI_PROVIDER");
  });

  it("enables FHIR with a base URL", () => {
    expect(
      getFeatureConfigStatus("fhir", { FHIR_BASE_URL: "https://fhir.example/fhir" })
        .configured,
    ).toBe(true);
  });

  it("requires all four Twilio variables", () => {
    const partial = {
      TWILIO_ACCOUNT_SID: "ACx",
      TWILIO_AUTH_TOKEN: "tok",
    };
    const status = getFeatureConfigStatus("twilio", partial);
    expect(status.configured).toBe(false);
    expect(status.missing).toEqual(
      expect.arrayContaining(["TWILIO_PHONE_NUMBER", "TWILIO_WHATSAPP_NUMBER"]),
    );
    expect(
      getFeatureConfigStatus("twilio", {
        ...partial,
        TWILIO_PHONE_NUMBER: "+1000",
        TWILIO_WHATSAPP_NUMBER: "whatsapp:+1000",
      }).configured,
    ).toBe(true);
  });

  it("requires all three Cloudinary credentials", () => {
    expect(
      getFeatureConfigStatus("cloudinary", {
        CLOUDINARY_CLOUD_NAME: "c",
        CLOUDINARY_API_KEY: "k",
        CLOUDINARY_API_SECRET: "s",
      }).configured,
    ).toBe(true);
    expect(
      getFeatureConfigStatus("cloudinary", {
        CLOUDINARY_CLOUD_NAME: "c",
      }).missing,
    ).toHaveLength(2);
  });

  it("treats a missing or dummy Stripe key as not configured", () => {
    expect(getFeatureConfigStatus("stripe", EMPTY).configured).toBe(false);
    expect(
      getFeatureConfigStatus("stripe", { STRIPE_SECRET_KEY: "sk_test_dummy" }).configured,
    ).toBe(false);
    expect(
      getFeatureConfigStatus("stripe", { STRIPE_SECRET_KEY: "sk_live_real" }).configured,
    ).toBe(true);
  });

  it("flags console email as a dev fallback and validates smtp/resend", () => {
    const consoleStatus = getFeatureConfigStatus("email", { EMAIL_PROVIDER: "console" });
    expect(consoleStatus.configured).toBe(false);
    expect(consoleStatus.devFallback).toBe(true);

    const smtpMissing = getFeatureConfigStatus("email", { EMAIL_PROVIDER: "smtp" });
    expect(smtpMissing.configured).toBe(false);
    expect(smtpMissing.missing).toContain("EMAIL_HOST");

    const smtpOk = getFeatureConfigStatus("email", {
      EMAIL_PROVIDER: "smtp",
      EMAIL_HOST: "smtp.example.com",
      EMAIL_USER: "u",
      EMAIL_PASSWORD: "p",
      EMAIL_FROM: "noreply@example.com",
    });
    expect(smtpOk.configured).toBe(true);

    const resendOk = getFeatureConfigStatus("email", {
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_x",
      EMAIL_FROM: "noreply@example.com",
    });
    expect(resendOk.configured).toBe(true);
  });

  it("never leaks secret values, only variable names", () => {
    const all = getAllFeatureConfigStatuses({
      AI_API_KEY: "super-secret",
      STRIPE_SECRET_KEY: "sk_live_secret",
    });
    const serialized = JSON.stringify(all);
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("sk_live_secret");
    expect(all.ai.missing).toContain("AI_PROVIDER");
    expect(all.stripe.configured).toBe(true);
  });

  it("links every feature to a public setup guide", () => {
    for (const feature of CONFIG_GATED_FEATURES) {
      expect(FEATURE_DOC_LINKS[feature]).toMatch(/^https:\/\//);
    }
  });
});
