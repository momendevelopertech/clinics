import type {
  ConfigGatedFeature,
  FeatureConfigStatus,
} from "@/lib/feature-config";
import { FEATURE_DOC_LINKS } from "@/lib/feature-config";

export type PendingServiceKind = "integration" | "decision";

export type PendingServiceStatus =
  | "connected"
  | "partial"
  | "missing"
  | "manual"
  | "decision";

/**
 * One card in the Super Admin "Pending Services" center.
 *
 * - `feature` set → status is LIVE from GET /api/config/status and flips to
 *   "connected" automatically once the env keys are provided (no code change).
 * - `feature` null + kind "integration" → no code/env gate exists yet ("manual"):
 *   the card lists what the vendor hands out and the build becomes possible
 *   once keys are available. `requiredVars` here are vendor-credential labels,
 *   not env names the code reads today.
 * - kind "decision" → pure business call, no credentials involved.
 */
export type PendingService = {
  id: string;
  kind: PendingServiceKind;
  feature: ConfigGatedFeature | null;
  nameKey: string;
  effectKey: string;
  usersKey: string;
  sourceKey: string;
  requiredVars: string[];
};

export const PENDING_SERVICES: readonly PendingService[] = [
  {
    id: "twilio",
    kind: "integration",
    feature: "twilio",
    nameKey: "svc_name_twilio",
    effectKey: "svc_effect_twilio",
    usersKey: "svc_users_reception_patient",
    sourceKey: "svc_source_twilio",
    requiredVars: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER",
      "TWILIO_WHATSAPP_NUMBER",
    ],
  },
  {
    id: "stripe",
    kind: "integration",
    feature: "stripe",
    nameKey: "svc_name_stripe",
    effectKey: "svc_effect_stripe",
    usersKey: "svc_users_biller",
    sourceKey: "svc_source_stripe",
    requiredVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  {
    id: "ai",
    kind: "integration",
    feature: "ai",
    nameKey: "svc_name_ai",
    effectKey: "svc_effect_ai",
    usersKey: "svc_users_doctors",
    sourceKey: "svc_source_ai",
    requiredVars: ["AI_PROVIDER", "AI_API_KEY"],
  },
  {
    id: "email",
    kind: "integration",
    feature: "email",
    nameKey: "svc_name_email",
    effectKey: "svc_effect_email",
    usersKey: "svc_users_all",
    sourceKey: "svc_source_email",
    requiredVars: ["EMAIL_PROVIDER", "EMAIL_HOST", "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_FROM"],
  },
  {
    id: "cloudinary",
    kind: "integration",
    feature: "cloudinary",
    nameKey: "svc_name_cloudinary",
    effectKey: "svc_effect_cloudinary",
    usersKey: "svc_users_all",
    sourceKey: "svc_source_cloudinary",
    requiredVars: [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ],
  },
  {
    id: "fhir",
    kind: "integration",
    feature: "fhir",
    nameKey: "svc_name_fhir",
    effectKey: "svc_effect_fhir",
    usersKey: "svc_users_biller",
    sourceKey: "svc_source_fhir",
    requiredVars: ["FHIR_BASE_URL"],
  },
  {
    id: "paymob",
    kind: "integration",
    feature: null,
    nameKey: "svc_name_paymob",
    effectKey: "svc_effect_paymob",
    usersKey: "svc_users_biller",
    sourceKey: "svc_source_paymob",
    requiredVars: ["Paymob API Key", "HMAC Secret", "Integration ID"],
  },
  {
    id: "video",
    kind: "integration",
    feature: null,
    nameKey: "svc_name_video",
    effectKey: "svc_effect_video",
    usersKey: "svc_users_doctors",
    sourceKey: "svc_source_video",
    requiredVars: ["DAILY_API_KEY"],
  },
  {
    id: "calendar",
    kind: "integration",
    feature: null,
    nameKey: "svc_name_calendar",
    effectKey: "svc_effect_calendar",
    usersKey: "svc_users_doctors",
    sourceKey: "svc_source_calendar",
    requiredVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  {
    id: "marketplace",
    kind: "decision",
    feature: null,
    nameKey: "svc_name_marketplace",
    effectKey: "svc_effect_marketplace",
    usersKey: "svc_users_owner",
    sourceKey: "svc_source_decision",
    requiredVars: [],
  },
  {
    id: "native",
    kind: "decision",
    feature: null,
    nameKey: "svc_name_native",
    effectKey: "svc_effect_native",
    usersKey: "svc_users_owner",
    sourceKey: "svc_source_decision",
    requiredVars: [],
  },
  {
    id: "loyalty",
    kind: "decision",
    feature: null,
    nameKey: "svc_name_loyalty",
    effectKey: "svc_effect_loyalty",
    usersKey: "svc_users_owner",
    sourceKey: "svc_source_decision",
    requiredVars: [],
  },
  {
    id: "charge-policy",
    kind: "decision",
    feature: null,
    nameKey: "svc_name_charge_policy",
    effectKey: "svc_effect_charge_policy",
    usersKey: "svc_users_biller",
    sourceKey: "svc_source_decision",
    requiredVars: [],
  },
];

export function getPendingServiceStatus(
  service: PendingService,
  features: Record<ConfigGatedFeature, FeatureConfigStatus> | null | undefined,
): PendingServiceStatus {
  if (service.kind === "decision") return "decision";
  if (!service.feature) return "manual";
  const live = features?.[service.feature];
  if (!live) return "missing";
  if (live.configured) return "connected";
  return live.devFallback ? "partial" : "missing";
}

export function getPendingServiceDocsUrl(service: PendingService): string | null {
  if (!service.feature) return null;
  return FEATURE_DOC_LINKS[service.feature] ?? null;
}
