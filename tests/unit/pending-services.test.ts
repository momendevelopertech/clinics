import { describe, expect, it } from "vitest";
import type {
  ConfigGatedFeature,
  FeatureConfigStatus,
} from "@/lib/feature-config";
import {
  PENDING_SERVICES,
  getPendingServiceDocsUrl,
  getPendingServiceStatus,
} from "@/lib/pending-services";

function features(
  overrides: Partial<Record<ConfigGatedFeature, Partial<FeatureConfigStatus>>> = {},
): Record<ConfigGatedFeature, FeatureConfigStatus> {
  const base: FeatureConfigStatus = { feature: "ai", configured: false, missing: [] };
  const full: Record<ConfigGatedFeature, FeatureConfigStatus> = {
    ai: { ...base, feature: "ai" },
    fhir: { ...base, feature: "fhir" },
    twilio: { ...base, feature: "twilio" },
    cloudinary: { ...base, feature: "cloudinary" },
    stripe: { ...base, feature: "stripe" },
    email: { ...base, feature: "email" },
  };
  for (const [key, value] of Object.entries(overrides)) {
    const feature = key as ConfigGatedFeature;
    full[feature] = { ...full[feature], ...value };
  }
  return full;
}

const byId = (id: string) => PENDING_SERVICES.find((s) => s.id === id)!;

describe("pending services center", () => {
  it("marks configured integrations as connected", () => {
    const live = features({
      twilio: { configured: true, missing: [] },
      cloudinary: { configured: true, missing: [] },
    });
    expect(getPendingServiceStatus(byId("twilio"), live)).toBe("connected");
    expect(getPendingServiceStatus(byId("cloudinary"), live)).toBe("connected");
  });

  it("marks unconfigured integrations as missing (email console as partial)", () => {
    const live = features({
      stripe: { configured: false, missing: ["STRIPE_SECRET_KEY"] },
      email: { configured: false, missing: ["EMAIL_PROVIDER"], devFallback: true },
    });
    expect(getPendingServiceStatus(byId("stripe"), live)).toBe("missing");
    expect(getPendingServiceStatus(byId("email"), live)).toBe("partial");
  });

  it("marks keyless integrations as manual and decisions as decision", () => {
    const live = features();
    expect(getPendingServiceStatus(byId("paymob"), live)).toBe("manual");
    expect(getPendingServiceStatus(byId("video"), live)).toBe("manual");
    expect(getPendingServiceStatus(byId("calendar"), live)).toBe("manual");
    expect(getPendingServiceStatus(byId("marketplace"), live)).toBe("decision");
    expect(getPendingServiceStatus(byId("charge-policy"), live)).toBe("decision");
  });

  it("treats unknown status payload as missing for gated services", () => {
    expect(getPendingServiceStatus(byId("ai"), null)).toBe("missing");
    expect(getPendingServiceStatus(byId("ai"), undefined)).toBe("missing");
  });

  it("exposes docs links only for config-gated services", () => {
    expect(getPendingServiceDocsUrl(byId("stripe"))).toContain("stripe.com");
    expect(getPendingServiceDocsUrl(byId("paymob"))).toBeNull();
    expect(getPendingServiceDocsUrl(byId("marketplace"))).toBeNull();
  });

  it("covers every inventory pending item exactly once", () => {
    const ids = PENDING_SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "twilio", "stripe", "ai", "email", "cloudinary", "fhir",
      "paymob", "video", "calendar",
      "marketplace", "native", "loyalty", "charge-policy",
    ]) {
      expect(ids).toContain(id);
    }
  });
});
