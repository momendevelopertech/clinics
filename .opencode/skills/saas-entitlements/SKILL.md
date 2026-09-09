---
name: saas-entitlements
description: Use whenever gating features behind plans, reading/writing subscriptions, plan limits, usage, upgrades/downgrades, plan overrides, locked-feature UI, or the Super Admin plan-management console in OpenHealthCRM. Explains the Plan → Entitlement → Module/Feature → Limit model, the DB models, the access-service functions, enforcement points, and the upgrade flow. Trigger on "plan", "subscription", "entitlement", "upgrade", "limit", "trial", "locked feature", "free/clinic/plus".
---

# SaaS Entitlements — Plan / Subscription / Limits

Users must never treat plans as permission system, nor permissions as feature gating. Two orthogonal axes:
- **Plan/Entitlement** = org-level feature *availability* + quantitative *limits* (what the clinic can do at all).
- **Permission/Role** = per-*user* authorization within the clinic (who may do it). See `rbac-permissions` skill.

## Data model (Postgres via Prisma)
- `Plan` — catalog row: `code` (unique, e.g. `free|clinic|plus`), `nameEn`, `nameAr`, `descriptionEn/Ar`, `price`, `billingCycle`, `status` (`active|archived`), `displayOrder`, `popular`, `trialDays`, `upgradeTargetId` (self-ref next plan), `modulesJson` (Record<moduleKey, {enabled, notes}>), `featuresJson` (Record<featureKey, {enabled, limit, upgradeMessageKey}>). JSON columns follow the existing `Organization.settingsJson` pattern.
- `Subscription` — per-org: `organizationId @unique`, `planId`, `status` (`trialing|active|past_due|canceled|expired`), `currentPeriodStart/End`, `trialEndsAt`, `cancelAtPeriodEnd`, `canceledAt`, `billingCycle`.
- `EntitlementOverride` — per-org exception rows: `moduleKey`/`featureKey`, `kind` (`module_override|feature_override|limit_override`), `valueJson`, `reason`, `createdById`, `expiresAt`. Overrides EXTEND the plan, never mutate it.
- `Organization.plan` is kept as a denormalized mirror of the subscription plan code (many legacy reads depend on it).

## Catalog (single source of truth)
`src/lib/entitlements/catalog.ts` defines MODULES (align with `permissions.ts` `CLINIC_MODULES`), FEATURES, and LIMIT definitions (`patients`, `staff`, `doctors`, `appointments_month`, `storage_gb` etc.) with `labelKey`, `group`, `premium`, `defaultEnabled`. Plan JSON values live in DB. Never scatter `if (plan === "clinic")` in pages — resolved through the access service.

## Access service (`src/lib/entitlements/`)
- `resolveOrgEntitlements(orgId)` → merged `{ modules, features, limits, plan, overrides }` (plan JSON + overrides).
- `hasModule(entitlements, "billing")` / `getLimit(entitlements, "patients")`, `hasFeature(...)`.
- Server guard `requireModuleEntitlement(orgId, module, feature?)` returns a 402-style response with `code: "PLAN_FEATURE_REQUIRED"`, `plan`, `upgradePlan` (from `plan.upgradeTargetId`), `upgradeMessageKey`.
- `canPerformAction({ user, orgId, module, feature, permission })` = plan availability AND permission.

## Enforcement points (keep these in sync)
- **Limits**: `POST /api/patients`, `POST /api/appointments`, and staff creation (`POST /api/signup` + staff role assignment — staff limit must be enforced too, not just patients/appointments).
- **Premium modules** (disabled on free plan): billing, payments, campaigns, automation, communications, reports, analytics → `requireModuleEntitlement` added to their API routes.
- **Nav**: sidebar shows Locked (🔒, upgrade link) for premium modules the org lacks, instead of hiding.
- **Pages**: premium page components render `<UpgradePrompt ...>` (i18n `upg_*` keys) when not entitled.
- Upgrade flow is manual (no payments): Owner → `POST /api/org/request-upgrade` → Super Admin approves in console → subscription + `org.plan` updated. `POST /api/super/orgs/[orgId]/plan` also maintains the subscription.

## Rules for new feature work
1. Find the module key in `CLINIC_MODULES` / catalog; if new, add to catalog + both plan modulesJson defaults + ROLE_MODULE_ACCESS if role-gated.
2. Server-side guard, then client handling (never rely on hiding UI).
3. i18n: every plan/feature/limit label has `en`+`ar` keys.
4. Existing behavior must not break: plans seed free/clinic/plus with the SAME limits legacy `src/lib/plans.ts` used; `clinic`/`plus` orgs retain all current modules.