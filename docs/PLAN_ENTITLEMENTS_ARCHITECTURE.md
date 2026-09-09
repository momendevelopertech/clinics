# Plan & Entitlement Architecture

DB-backed SaaS upgrade path for OpenHealthCRM. Enforced at the API layer (source of truth),
displayed at the UI layer, fully bilingual AR/EN + RTL/LTR, responsive from 1920px to 375px.

## Data model

- `Plan` — catalog row. Carries JSON blobs: `modulesJson` (module → `{enabled, notes}`) and
  `featuresJson` (feature/limit key → `{enabled, limit, upgradeMessageKey}`). Upgrade path via
  `upgradeTargetId` + `downgradeTargetIdsJson` (downgrade must be explicitly allowed).
- `Subscription` — one per `Organization` (`organizationId` unique). Mirrors `Organization.plan`
  (denormalized) which stays as the legacy source used across the app.
- `EntitlementOverride` — per-org, per-module/feature `valueJson` with optional expiry. Effective
  value wins over the plan (source becomes `overridden`, rendered as an amber badge).

Seeded plans (from `20260909120000_plan_subscription_entitlements`):

| Plan  | Code    | Price/month | Billing    | Modules locked | Limits                                      | Premium features                      |
|-------|---------|-------------|------------|----------------|---------------------------------------------|---------------------------------------|
| Free  | `free`  | $0          | monthly    | billing, payments, communications, campaigns, automation | 50 patients, 2 staff, 1 doctor, 200 appts/mo, 1 GB | basic reports, audit trail |
| Clinic| `clinic`| $99         | monthly    | campaigns, automation | 500 patients, 10 staff, 5 doctors, 5,000 appts/mo, 10 GB | + CRM, financial reports, patient portal, online booking, SMS/email reminders |
| Plus  | `plus`  | $249        | monthly    | —                        | unlimited patients/staff/doctors/appts, 100 GB | + campaigns, automation, advanced reports, multi-branch, priority support |

`modulesJson`/`featuresJson` are authoritative for current behavior; static config in
`src/lib/plans.ts` remains only as a fallback for `getPlanLimits` / tests.

## Resolution rules (src/lib/entitlements/*)

1. Read `Organization.plan`, load `Plan` by `code` (unknown code → safe `free`).
2. Merge active `EntitlementOverride`s (skip expired).
3. Compute usage (`getOrgUsageSnapshot`) and `limitUsage` (`computeLimitUsage`): unlimited rows
   render at 0%, `nearLimit = percent >= 80` (≥90 red, ≥70 amber elsewhere).
4. `LIMIT_KEY_UNLIMITED = 999_999_999` and `limit: null` both mean unlimited (`asLimit`,
   `isUnlimitedValue`).

`catalog.ts` is importable from client components (module keys live in the dependency-free
`module-names.ts`) — keep it free of server-only imports (no `prisma`).

## Enforcement (API = source of truth)

- `requireModuleEntitlement(orgId, moduleKey)` / `requireFeatureEntitlement(...)` return
  `planLockedResponse` → HTTP **402** `{ code: "PLAN_FEATURE_REQUIRED", plan, upgradePlan, module,
  feature, upgradeMessageKey }`.
- `checkPlanLimit(orgId, resource)` for `patients | staff | appointments` (→ `appointments_month`).
- Guarded endpoints: billing/invoices (GET+POST), payments (POST+GET),
  communications (GET+POST), communications/campaigns (GET+POST), automation/signals.
- Cron endpoints (`communications/scheduled`, `appointment-reminders`) are intentionally not gated
  (sessionless jobs; the creating endpoints are).
- All other existing guards remain: `requireSuperAdmin` (all `/api/super/*`),
  `assertOrgScope` (org-scoped reads), role/permission checks per module.

## API surface

| Route | Method(s) | Purpose |
|-------|-----------|---------|
| `/api/plan/entitlements` | GET | resolved entitlements + usage + limitUsage for current org |
| `/api/org/request-upgrade` | POST | owner requests a plan (existing) |
| `/api/super/plans` | GET, POST | list (with `_count.subscriptions`) / create |
| `/api/super/plans/[id]` | GET, PATCH, DELETE | read / update / archive-if-subscribed else delete |
| `/api/super/plans/[id]/duplicate` | POST | copy → code `-copy-<ts36>`, archived, order 999 |
| `/api/super/orgs/[orgId]/detail` | GET | org + subscription + overrides + staff + branches + entitlements + usage |
| `/api/super/orgs/[orgId]/plan` | POST | change plan (upserts Subscription in a transaction) |
| `/api/super/orgs/[orgId]/upgrade` | POST | approve/decline pending upgrade request |
| `/api/super/orgs/[orgId]/override` | GET, POST | list / create override (validated, audit-logged) |
| `/api/super/orgs/[orgId]/override/[overrideId]` | DELETE | remove override (audit-logged) |

## UI

- `/plan` (owner): usage bars + near-limit warnings, current plan, recommendation to the
  `upgradeTarget`, plan cards (limits + "available in X" for missing premium features),
  upgrade request form, and a grouped compare table (`?lock=<module>` scrolls to it).
- Sidebar: locked premium items render amber with a `Lock` badge and link to
  `/plan?lock=<module>`; the server resolves `planModules` per org in `(dashboard)/layout.tsx`.
- `UpgradePrompt`: amber banner on the five premium pages (billing, payments, communications,
  campaigns, automation).
- Super-admin: `/super/plans` (reorder, CRUD, duplicate, archive) and
  `/super/clinics/[orgId]` (subscription, usage bars, module matrix, overrides CRUD, plan change,
  approve/decline). Linked from the super console header, sidebar, and org rows.

## i18n

Every key used exists in both `src/lib/i18n/dictionaries/en.ts` and `ar.ts`; tests assert key-set
parity plus `mtr_*`/`nav_*` coverage.

## Tests

`tests/unit/entitlements.test.ts` (15 cases): catalog defs/labels, premium-module gating per plan
(from the migration seed JSON), limits incl. plus-unlimited (`null` limit), `computeLimitUsage`
(near-limit, unlimited, overrides), and EN/AR dictionary parity. Full suite: 92 passing.

## Applying to a real database

```sh
DATABASE_URL=... npx prisma migrate deploy
```
`Subscription` backfill is idempotent (`ON CONFLICT ("organizationId") DO NOTHING`).