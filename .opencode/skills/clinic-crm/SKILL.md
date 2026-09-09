---
name: clinic-crm
description: Use whenever working on the OpenHealthCRM codebase, a Next.js 16 + React 19 + Prisma (Postgres/Neon) clinic SaaS with Arabic/English RTL/LTR. Explains the real project structure, tenant model, data-flow patterns, module/plan/permission systems, i18n conventions, and the exact guard functions to use when adding pages, API routes, or components. Trigger on any task that touches src/app routes, src/lib, prisma, sidebar, contexts, or adding/editing features.
---

# OpenHealthCRM — System Guide

Stack: Next.js 16 (App Router, Turbopack, `src/`), React 19, TypeScript, Prisma + PostgreSQL (Neon via `@prisma/adapter-pg` `Pool`), Tailwind v4, framer-motion, next-auth v4 (JWT, Credentials), sonner toasts, vitest.

## Paths that matter
- `src/app/(dashboard)/**` — clinic workspace pages (single layout: `(dashboard)/layout.tsx`).
- `src/app/super/page.tsx` — **the only** platform admin console (client component `src/components/super/super-console.tsx`, 5 sections via `?section=`).
- `src/app/api/**` — all data/mutations are API route handlers (route-centric; NOT server actions).
- `src/lib/` — libs: `prisma.ts`, `auth.ts` (permissions), `authorization.ts` (guards), `roles.ts` (role guards), `permissions.ts` (module access), `plans.ts` (plan limits), `i18n/`, `validations/` (zod).
- `src/components/` — UI (aligned with shadcn daisyUI/`Button`, `Card`, `Dialog`, `DropdownMenu`, `Select`, `Input`, `sonner` toasts).
- `tests/unit/*.test.ts` — vitest; use `src/lib` pure functions; `@/` alias works, node env.

## Tenant model (CRITICAL)
- **Tenant = `Organization`** (not "Clinic"; physical locations are `Branch`). Every query must scope by `organizationId`.
- Canonical API handler shape:
  1. `const orgId = await getOrgId(); assertOrgScope(orgId);`
  2. `const authz = await requireModulePermission(orgId, "<module>")` or `requireAnyPermission(orgId, [{ action, resource }])`; return `authz.response` if set (403).
  3. Query ALWAYS with `where: { organizationId: orgId }` (or nested `entity: { organizationId: orgId }` for tables lacking the FK).
  4. Owning record 404 check: `findFirst({ where: { id, organizationId: orgId } })`.
- Owner/super-admin routes use `requireOwner({ json: true })` / `requireSuperAdmin()`.
- `src/app/actions/patients.ts` is legacy dead code with NO scoping — never import it.

## Guards available
- `requireSuperAdmin()` — session role + `user.role === "superAdmin"` double check.
- `requireOwner({ json: true })` — clinic Owner.
- `requireModulePermission(orgId, module)` — module-level (falls back to `ROLE_MODULE_ACCESS` for legacy clinics); Owner/superAdmin pass.
- `requireAnyPermission(orgId, [{ action, resource }])` — fine-grained.
- `hasPermission(userId, orgId, action, resource?)` — raw check.
- Plan entitlement guards (new): see `saas-entitlements` skill before gating anything behind plans.

## i18n rules
- Flat dictionaries `src/lib/i18n/dictionaries/en.ts` + `ar.ts` (~1090 keys, mirrored 1:1). Key = `{section}_{camelCase}`. `t(key)` returns the key if missing (no interpolation — use `.replace("{x}", v)`).
- Client: `const { t, dir, lang } = useLocale()` from `locale-provider`. **Call `t("key")`**, never `t["key"]` (bracket access is a bug found repo-wide).
- Server: `const t = await getDictionary()` from `@/lib/i18n/server`.
- Locale persisted in `lang` cookie (1y); switching triggers full reload; RTL is `<html dir>` server-rendered. Add ALL new strings to BOTH dictionaries or Arabic UI shows raw keys.
- Never hardcode English placeholders/labels in JSX.

## Sidebar
- `src/components/ui/dashboard-with-collapsible-sidebar.tsx`. `navGroups` + `systemItems`; `canAccess(roles)` role gate; `owner`/`Super Admin` bypass role gates. Super Admin path clears clinic nav and pushes 5 super links. Route titles map in `routeTitleKeys`. When adding nav items, add `t("nav_*")` and a `routeTitleKey`.

## Conventions / gotchas
- Combine class names with `cn()` from `@/lib/utils`.
- Rounded style tokens used in the design system: `surface-panel`, rounded ~`[24px]`/`[28px]`, `border-white/55 dark:border-white/6`.
- Feature tips: `FeatureTip tipId="..."` wraps HOST elements only (must not sit inside a Radix `asChild` target — wrap a `span.inline-flex` around the trigger instead). Config in `src/lib/feature-tips/config.tsx`.
- New tabular UI: no raw `<table>` without vertical scroll handling; responsive grids `grid gap-* md:grid-cols-*`.