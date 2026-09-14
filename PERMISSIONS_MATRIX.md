# OpenHealthCRM — Permissions Matrix

Tenant model: every query is scoped by `organizationId`. Cross-organization access is strictly forbidden.

## Headline rule — Owner Override

> **Owner Override: the Owner holds Edit+Delete on every record inside their own organizationId regardless of which role originally created it (prescription written by a doctor, invoice created by billing staff, stock item added by pharmacy, task created by reception, etc.). Cross-organization access is strictly forbidden (org scoping on every query).**

There is no `createdBy`-only block anywhere in `src/app/api/**/route.ts`. No endpoint denies the Owner edit/delete on the grounds that another role created the record. The single author-aware route (`prescription-templates/[id]`) explicitly grants author-OR-Owner (`src/app/api/prescription-templates/[id]/route.ts:23-62`), i.e. the Owner path bypasses authorship.

## Guard primitives

| Guard | File:line | Semantics |
|---|---|---|
| `isOwner()` / `requireOwner({json:true})` | `src/lib/roles.ts:40-78` | True if RBAC role includes `Owner`/`Super Admin`, or denormalized `User.role === "owner"`. Otherwise 403 / redirect. |
| `requireSuperAdmin()` | `src/lib/roles.ts:89-110` | Requires RBAC `Super Admin` AND denormalized `User.role === "superAdmin"` + `active`. Prevents tenants self-granting platform access. |
| `requireAnyPermission(orgId, [...])` | `src/lib/authorization.ts:16-31` | Passes if `hasAnyPermission` grants any listed `{action, resource}` pair. Else 403. |
| `requireModulePermission(orgId, module, action)` | `src/lib/permissions.ts:64-90` | Wraps `requireAnyPermission` with `{action: "<module>:<action>"}`; on read-denial falls back to `ROLE_MODULE_ACCESS` (+ owner/superAdmin bypass). |
| `hasPermission(userId, orgId, action, resource)` | `src/lib/auth.ts:24-65` | RBAC lookup via `userRoles → role.permissions`. **Bypasses only `Super Admin`** (`src/lib/auth.ts:47-53`). Owner has no bypass here — it relies on its 36 seeded RBAC grants. |
| `ROLE_MODULE_ACCESS` | `src/lib/permissions.ts:34-58` | `Owner: CLINIC_MODULES` (all 26); Doctor / Nurse / Care Coordinator / Biller / Pharmacist subsets. Receptionist is not a key (Care Coordinator entry covers it). |
| `CLINIC_PAGE_ACCESS` (page middleware) | `src/proxy.ts:37-66`, enforced `src/proxy.ts:80-90,168-170` | `/plan`, `/settings`, `/staff`, `/integrations` = Owner-only. All other clinic pages role-mapped; `Owner`/`Super Admin` bypass every page (`src/proxy.ts:85`). |

## Owner seed grants (~36: 16 granular + 20+ module reads)

Source: `prisma/seed.js:467-484` (`ownerPermissions`), `prisma/seed.js:427-443` (`ownerModules`).

16 granular (`prisma/seed.js:468-483`): `patients:read/write`, `appointments:read/write`, `encounters:read/write`, `inventory:read/write`, `billing:read/write`, `lab:read/write`, `pharmacy:read/write`, `staff:read/write`.

Plus one `<module>:read` grant per module in `ownerModules` (`prisma/seed.js:438-443`, via `withModulePermissions`, `prisma/seed.js:429-437`, deduped): `dashboard, patients, appointments, queue, encounters, analytics, consents, audit, labs, tasks, documents, reports, availability, catalogs, communications, locations, waitlist, billing, payments, inventory, automation, campaigns, settings, plan, help` (25 listed; ~20 net-new after dedup against the 16 granular).

Notable scoping facts encoded in the seed:

- Owner has `catalogs:read` but only read (writes are `requireOwner`-gated, not grant-gated).
- Owner has `inventory:read+write` (full inventory access).
- No `coupons:*` or `insurance:*` grants exist for any role — coupons and insurance routes ride on `billing` module/permission checks instead.
- Insurance data still exists (`InsurancePolicy`/`InsuranceClaim`, `prisma/seed.js:1678-1753`); its API surface is guarded via billing grants, not dedicated insurance grants.

## Endpoint guard table — Owner can edit/delete others' records?

`Guard` = the authorization gate on the route. `Owner vs. creator` = can the Owner mutate a record created by another role in the same org? **YES everywhere except N-A (no per-record mutation) or self-scoped rows noted below.** Verified: no `createdBy`-only denial exists in any `src/app/api/**/route.ts`.

| Endpoint (representative) | Guard | Owner can edit/delete others' records? |
|---|---|---|
| `src/app/api/super/**` (plans, orgs, upgrades, overrides, audit, approvals, settings) | `requireSuperAdmin` (`src/lib/roles.ts:89-110`; e.g. `src/app/api/super/plans/route.ts:8,27`) | N-A (platform scope; tenants including Owners are denied) |
| `src/app/api/branches/route.ts` + `[id]/route.ts` | GET: module `locations` + permission; write: `requireOwner` (`src/app/api/branches/route.ts:34`, `src/app/api/branches/[id]/route.ts:13`) | YES (write path is Owner-only; no creator check) |
| `src/app/api/rooms/route.ts` + `[id]/route.ts` | `requireOwner` (`src/app/api/rooms/route.ts:32`, `src/app/api/rooms/[id]/route.ts:13`) | YES |
| `src/app/api/catalogs/route.ts` (POST) | GET: module `catalogs` + permission; POST: `requireOwner` (`src/app/api/catalogs/route.ts:17-23,41`) | YES (write path Owner-only) |
| `src/app/api/settings/route.ts` | `requireOwner` (`src/app/api/settings/route.ts:34`) | YES |
| `src/app/api/staff/route.ts`, `staff/roles/route.ts` | `requireOwner` (`src/app/api/staff/route.ts:39`, `src/app/api/staff/roles/route.ts:27`) | YES (role assignment is Owner-only) |
| `src/app/api/shifts/route.ts`, `shifts/[id]/route.ts` | `requireOwner` (`src/app/api/shifts/route.ts:39`, `src/app/api/shifts/[id]/route.ts:16`) | YES |
| `src/app/api/intake-forms/route.ts`, `[id]/route.ts`, `[id]/fields/route.ts` | `requireOwner` (`src/app/api/intake-forms/route.ts:28`, `src/app/api/intake-forms/[id]/route.ts:17,68`, `src/app/api/intake-forms/[id]/fields/route.ts:18`) | YES |
| `src/app/api/reports/schedules/route.ts`, `schedules/[id]/route.ts` | `requireOwner` (`src/app/api/reports/schedules/route.ts:31`, `src/app/api/reports/schedules/[id]/route.ts:16`) | YES |
| `src/app/api/webhooks/route.ts`, `webhooks/[id]/route.ts` | `requireOwner` (`src/app/api/webhooks/route.ts:28,63`, `src/app/api/webhooks/[id]/route.ts:20,62`) | YES |
| `src/app/api/api-keys/route.ts`, `api-keys/[id]/revoke/route.ts` | `requireOwner` (`src/app/api/api-keys/route.ts:23,55`, `src/app/api/api-keys/[id]/revoke/route.ts:14`) | YES |
| `src/app/api/org/export/route.ts`, `org/request-upgrade/route.ts` | `requireOwner` (`src/app/api/org/export/route.ts:20`, `src/app/api/org/request-upgrade/route.ts:14`) | N-A (org-level action, no per-record creator) |
| `src/app/api/prescription-templates/[id]/route.ts` (PATCH/DELETE) | Module `labs` + `encounters:write`/`patients:write`, then author-OR-Owner (`OWNER_ROLES`, `src/app/api/prescription-templates/[id]/route.ts:23-62`) | YES — Owner (`owner`/`superAdmin` role, case-insensitive) bypasses authorship; non-owner non-authors get 403 |
| `src/app/api/patients/**`, `appointments/**`, `encounters/**`, `invoices|billing/**`, `inventory/**`, `pharmacy/**`, `tasks/**`, `labs/**`, `documents/**`, `consents/**`, `communications/**`, `coupons/**` (via billing), insurance surfaces (via billing) | Org-scoped `requireModulePermission` + `requireAnyPermission` (e.g. `appointments/route.ts:23,91,322`; `coupons/route.ts:14-41`; `vitals/route.ts:14-64`) | YES — checks are `{organizationId + module/granular grant}`; no `createdBy` comparison |
| `src/app/api/notifications/route.ts` (GET), `notifications/[id]/route.ts` (PATCH) | Self-scoped: `where: { organizationId, recipientId: userId }` (`src/app/api/notifications/route.ts:11-12`, `src/app/api/notifications/[id]/route.ts:7-11`) | N-A by design (inbox; see below). POST (send) requires `staff:write` (`src/app/api/notifications/route.ts:23`) with same-org recipient check (`:27-28`) |
| `src/app/api/profile/avatar/route.ts`, `profile/availability/route.ts` | Self-scoped: `where: { id: context.userId }` (`src/app/api/profile/avatar/route.ts:28,57-62`, `src/app/api/profile/availability/route.ts:13,33`); availability also requires module `availability` | N-A by design (own profile; see below) |
| `src/app/api/patient-portal/**` (visits, invoices, documents) | Patient-session, own-patient scoped (read-only) | N-A (patient surface, not staff RBAC) |

## Models whose write path is Owner-only

Writes (create/update/delete/revoke as applicable) require `requireOwner`, regardless of creator. Reads may use module/permission checks.

| Model / surface | Write guard |
|---|---|
| Branch | `src/app/api/branches/route.ts:34`, `src/app/api/branches/[id]/route.ts:13` |
| Room | `src/app/api/rooms/route.ts:32`, `src/app/api/rooms/[id]/route.ts:13` |
| ServiceCatalog / ClinicalCatalog | `src/app/api/catalogs/route.ts:41` (POST; GET is module+permission `:17-23`) |
| User roles / staff assignment | `src/app/api/staff/route.ts:39`, `src/app/api/staff/roles/route.ts:27` |
| Shift | `src/app/api/shifts/route.ts:39`, `src/app/api/shifts/[id]/route.ts:16` |
| IntakeForm (+ fields) | `src/app/api/intake-forms/route.ts:28`, `src/app/api/intake-forms/[id]/route.ts:17,68`, `src/app/api/intake-forms/[id]/fields/route.ts:18` |
| ReportSchedule | `src/app/api/reports/schedules/route.ts:31`, `src/app/api/reports/schedules/[id]/route.ts:16` |
| Webhook | `src/app/api/webhooks/route.ts:28,63`, `src/app/api/webhooks/[id]/route.ts:20,62` |
| ApiKey | `src/app/api/api-keys/route.ts:23,55`, `src/app/api/api-keys/[id]/revoke/route.ts:14` |
| Settings / org export / upgrade request | `src/app/api/settings/route.ts:34`, `src/app/api/org/export/route.ts:20`, `src/app/api/org/request-upgrade/route.ts:14` |

Page-level mirror: `/plan`, `/settings`, `/staff`, `/integrations` are Owner-only pages (`src/proxy.ts:38-41`).

## Self-scoped exceptions (not violations)

These rows filter by the caller's own id by design; they do not contradict the Owner Override because they are personal surfaces, not shared business records:

- Notification inbox: GET lists `where: { organizationId, recipientId: userId }` (`src/app/api/notifications/route.ts:11-12`); status PATCH uses `updateMany({ where: { id, organizationId, recipientId: userId } })` (`src/app/api/notifications/[id]/route.ts:7-11`). Sending (POST) is permission-gated (`staff:write`, same-org recipient, `:23-28`).
- Own profile avatar: read/write target `where: { id: context.userId }` (`src/app/api/profile/avatar/route.ts:28,57-64`).
- Own availability: updates `where: { id: context.userId }` after module `availability` check (`src/app/api/profile/availability/route.ts:13,33`).
- Patient portal (`src/app/api/patient-portal/**`): patient sessions see only their own visits/invoices/documents (own-patient scoped, read-only).

## Caveats

- `hasPermission` (`src/lib/auth.ts:24-65`) bypasses **only** `Super Admin` (`:47-53`). The Owner gets no code bypass there; Owner access flows through its seeded RBAC grants (16 granular + module reads, `prisma/seed.js:467-484`) plus the read-fallback in `requireModulePermission` (`src/lib/permissions.ts:72-90`, which also honors `user.role === "owner"`).
- `requireSuperAdmin` additionally demands the denormalized `User.role === "superAdmin"` flag (`src/lib/roles.ts:100-107`), so a tenant cannot escalate itself to platform scope.
- `OWNER_ROLES` in prescription-templates is `{"owner","superAdmin"}` matched case-insensitively against RBAC role names (`src/app/api/prescription-templates/[id]/route.ts:23,53-55`) — consistent with the Owner Override, not an exception to it.
