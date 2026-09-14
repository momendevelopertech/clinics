/**
 * Public (logged-out-safe) projection of the internal roles guide.
 *
 * The internal source (`src/lib/roles-guide-data.ts`) documents every click
 * together with the API endpoint / file / i18n key behind it — exactly what a
 * first-time visitor must NEVER see. This module derives a human-only view:
 * same roles, same everyday tasks, but with every technical clause stripped
 * and navigation expressed as localized page names instead of routes.
 *
 * Pure + client-safe (no prisma / server imports) so it can be used by the
 * public page component AND by node unit tests.
 */
import {
  ROLES_GUIDE,
  getRoleModules,
  type GuideRole,
  type LText,
} from "@/lib/roles-guide-data";

/** Platform-internal roles hidden from the public page. */
export const PUBLIC_EXCLUDED_ROLE_IDS = ["super-admin"] as const;

export type PublicTask = {
  id: string;
  icon: string;
  title: LText;
  where: LText;
  steps: LText[];
  result: LText;
};

export type PublicRoleStory = {
  id: string;
  icon: string;
  name: LText;
  profile: LText;
  landing: LText;
  /** Available module keys only (labels resolved via nav_* dictionary). */
  modules: string[];
  tasks: PublicTask[];
  boundaries: LText[];
};

/** Dynamic plan data parsed from GET /api/plan/entitlements (backend shape). */
export type PublicPlanSummary = {
  planCode: string;
  planName: string;
  enabledModules: number;
};

/**
 * Validate + narrow an unknown JSON payload into a PublicPlanSummary.
 * Mirrors src/app/api/plan/entitlements/route.ts response keys
 * ({ orgId, plan, modules, features, overrides, source, usage, limitUsage }).
 * Returns null for 401 bodies, network garbage, or shape drift.
 */
export function parseEntitlementsResponse(payload: unknown): PublicPlanSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const plan = root.plan as Record<string, unknown> | null | undefined;
  if (!plan || typeof plan.code !== "string" || plan.code.length === 0) return null;
  const modules = root.modules;
  let enabledModules = 0;
  if (modules && typeof modules === "object") {
    for (const value of Object.values(modules as Record<string, unknown>)) {
      if (value === true) enabledModules += 1;
    }
  }
  const name =
    typeof plan.nameEn === "string" && plan.nameEn.length > 0 ? plan.nameEn : plan.code;
  return { planCode: plan.code, planName: name, enabledModules };
}

// ---------------------------------------------------------------------------
// Technical-leak detection + sanitization
// ---------------------------------------------------------------------------

/** Clauses matching any of these are backend jargon, not user language. */
const TECHNICAL_CLAUSE = [
  /\/api\//i, // GET /api/plan/entitlements, POST /api/staff/roles ...
  /\bsrc\//, // src/app/(dashboard)/...
  /\.(tsx?|json|sql|prisma)\b/i, // page.tsx, settings.ts ...
  /\b(GET|POST|PATCH|PUT|DELETE)\b/, // HTTP verbs
  /\brequire[A-Z]\w*\b/, // requireOwner, requireSuperAdmin ...
  /\b(Zod|HMAC|PITR|Neon|SERIALIZABLE|FHIR|upsert|loadAll|act\(\))\b/i,
  /purpose\s*=/, // CloudinaryImageUpload (purpose=clinic_logo)
  /scopes\s*:/, // scopes:[fhir:write]
  /\([A-Za-z][\w]*_[\w.]+\)/, // (settings_saveChanges), (super_navBilling)
  /\b[A-Za-z]+_[A-Za-z][\w]*\b/, // staff_assignRole, common_delete, sec_exportBtn
  /\{[^}\n]{0,90}\}/, // {userId, roleId} payloads
  /\b(40[0349]|50[04])\b/, // 403 / 404 / 409 / 500
  /…/, // …/override shorthands
  /platform-admin/, // platform-admin org internals
  /\btoast\s+\w+/, // toast settings_saved
  /\b[A-Za-z]+\(\)/, // load(), act()
  /\bS\d+\b/, // S1/S2 internal actions
  /\b[A-Z][a-z]+[A-Z]\w*/, // DoctorBoard, PlanDashboard, PlansManager ...
  /\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/, // clinicLogoUrl, nameAddress (lowerCamelCase code)
];

/** True when a (sanitized) string still exposes backend/implementation detail. */
export function containsTechnicalLeak(text: string): boolean {
  return TECHNICAL_CLAUSE.some((pattern) => pattern.test(text));
}

/** "settings" -> "Settings" fallback when no dictionary label exists. */
function fallbackRouteLabel(route: string): string {
  return route.charAt(0).toUpperCase() + route.slice(1);
}

function splitClauses(text: string): string[] {
  return text
    .split(/[.!؟]+\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function cleanPunctuation(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/^[—–\-:،,.\s]+/, "")
    .replace(/[—–\-:،,.\s]+$/, "")
    .trim();
}

/**
 * Strip backticks/parens-keys, humanize /routes via routeLabel, drop
 * technical clauses, and normalize standalone jargon words.
 * `lang` keeps word replacements in the reader's language (no mixed text).
 */
export function sanitizeHumanText(
  raw: string,
  lang: "ar" | "en",
  routeLabel: (route: string, lang: "ar" | "en") => string,
): string {
  if (!raw) return "";
  // Standalone jargon words -> plain language (before clause filtering).
  const integrationWord = lang === "ar" ? "التكامل" : "integration";
  const webhookWords = lang === "ar" ? "التنبيهات الخارجية" : "external notifications";
  const buttonWord = lang === "ar" ? "الزر" : "the button";
  let text = raw
    .replace(/`/g, "")
    .replace(/\bAPI\b/g, integrationWord)
    .replace(/\bwebhooks?\b/gi, webhookWords);
  // Cut out "via/through METHOD /api/..." fragments but KEEP the human action:
  // "يسجل معدة عبر POST /api/equipment بالـ {...}" -> "يسجل معدة".
  text = text
    .replace(/[.،,]?\s*(عبر|بواسطة|باستخدام)\s+(GET|POST|PATCH|PUT|DELETE)\s+\/api\/\S+/gi, "")
    .replace(/[.،,]?\s*(فينفذ|وينفذ)\s+(GET|POST|PATCH|PUT|DELETE)?\s*\/api\/\S+/g, "")
    .replace(/[.،,]?\s*(via|using|firing)\s+(GET|POST|PATCH|PUT|DELETE)?\s*\/api\/\S+/gi, "")
    .replace(/\s*(بالـ?|with)\s*\{[^}\n]{0,120}\}/g, "")
    .replace(/\([^()\n]{0,80}\/api\/[^()\n]{0,80}\)/gi, "")
    .replace(/\([^()\n]*\.(tsx?|ts|json|sql|prisma)[^()\n]*\)/gi, "")
    .replace(/\([^()\n]*purpose\s*=[^()\n]*\)/g, "")
    .replace(/\(([A-Za-z0-9_/·|.,+-]{2,})\)/g, "")
    .replace(/\b(GET|POST|PATCH|PUT|DELETE)\s+\/[\w/[\].?-]*\S*/g, "")
    // "يدوس staff_assign" / "clicks common_add" -> "يدوس الزر" (button labels).
    .replace(/\b(clicks|presses|click)\s+[a-z]+_[A-Za-z][\w]*/gi, `$1 ${buttonWord}`)
    .replace(/(يدوس|يضغط)\s+[a-z]+_[A-Za-z][\w]*/g, `$1 ${buttonWord}`)
    // Inline component/field names (AddItemDialog, clinicLogoUrl) -> dropped token.
    .replace(/\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g, "")
    .replace(/\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/g, "")
    .replace(/\(\s*\)/g, "");
  text = text.replace(/\/\[[^\]/]+\]/g, ""); // /[id], /[orgId] are technical
  text = text.replace(/(\/[a-z][a-z0-9-]*)+/g, (run) => {
    // Multi-segment runs ("/print/prescription") would glue into a fake
    // CamelCase token ("PrintPrescription"); keep the section (first segment).
    const key = run.split("/").filter(Boolean)[0] ?? "";
    const label = routeLabel(key, lang);
    return label === key ? fallbackRouteLabel(key) : label;
  });
  const kept = splitClauses(text).filter((clause) => !containsTechnicalLeak(clause));
  return cleanPunctuation(kept.join(". "));
}

function sanitizeLText(
  raw: LText,
  routeLabel: (route: string, lang: "ar" | "en") => string,
): LText {
  return {
    ar: sanitizeHumanText(raw.ar, "ar", routeLabel),
    en: sanitizeHumanText(raw.en, "en", routeLabel),
  };
}

const WORKSPACE_FALLBACK: LText = {
  ar: "من داخل مساحة العمل",
  en: "Inside your workspace",
};

function toPublicTask(
  task: GuideRole["tasks"][number],
  routeLabel: (route: string, lang: "ar" | "en") => string,
): PublicTask | null {
  const where = sanitizeLText(task.where, routeLabel);
  const steps = task.steps
    .map((step) => sanitizeLText(step, routeLabel))
    .filter((step) => step.ar.length > 0 && step.en.length > 0);
  const result = sanitizeLText(task.result, routeLabel);
  const hasBody =
    steps.length > 0 || where.ar.length > 0 || result.ar.length > 0;
  if (!hasBody) return null;
  return {
    id: task.id,
    icon: task.icon,
    title: sanitizeLText(task.title, routeLabel),
    where: where.ar.length > 0 ? where : WORKSPACE_FALLBACK,
    steps,
    result,
  };
}

/**
 * Project the internal guide into public, human-only stories.
 * routeLabel maps a route segment ("settings") in the requested language to
 * its localized page name — backed by the nav_* dictionary of each locale.
 */
export function toPublicStories(
  routeLabel: (route: string, lang: "ar" | "en") => string,
): PublicRoleStory[] {
  return ROLES_GUIDE.filter(
    (role) => !(PUBLIC_EXCLUDED_ROLE_IDS as readonly string[]).includes(role.id),
  ).map((role) => {
    const tasks = role.tasks
      .map((task) => toPublicTask(task, routeLabel))
      .filter((task): task is PublicTask => task !== null);
    const boundaries = role.boundaries
      .map((item) => sanitizeLText(item, routeLabel))
      .filter((item) => item.ar.length > 0 && item.en.length > 0);
    return {
      id: role.id,
      icon: role.icon,
      name: role.name,
      profile: sanitizeLText(role.profile, routeLabel),
      landing: sanitizeLText(role.landing, routeLabel),
      modules: getRoleModules(role)
        .filter((module) => module.available)
        .map((module) => module.key),
      tasks,
      boundaries,
    };
  });
}
