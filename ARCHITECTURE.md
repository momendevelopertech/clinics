# Architecture & Full Codebase Audit — عيادات CRM (OpenHealthCRM)

**Audit date:** 10 September 2026  
**Stack:** Next.js 16 · React 19 · Prisma 7 · PostgreSQL · Auth.js (NextAuth) · Stripe · Twilio · Redis/BullMQ · Serwist PWA · Vitest · Playwright  
**Verdict:** Strong multi-tenant clinic SaaS foundation (staging/demo quality). Not fully production-hardened yet — see §5–§8.

---

## 1. System map (mental model)

```
┌─────────────────────────────────────────────────────────────────┐
│  Clients                                                        │
│  Staff Dashboard (AR/EN RTL) · Patient Portal · Super Admin     │
│  PWA (Serwist SW · offline queue · Web Push)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│  Next.js App Router                                             │
│  proxy.ts → auth JWT · page RBAC · rate limit                   │
│  Route Handlers (/api/*) · Server Components                    │
└───┬──────────────┬──────────────┬──────────────┬────────────────┘
    │              │              │              │
┌───▼───┐   ┌──────▼─────┐  ┌────▼────┐   ┌─────▼──────┐
│Prisma │   │ Redis      │  │ Stripe  │   │ Email/SMS  │
│Postgres│  │ rate limit │  │ webhooks│   │ Twilio/SMTP│
│       │   │ BullMQ     │  │ payments│   │ Resend     │
└───────┘   └────────────┘  └─────────┘   └────────────┘
```

**Tenancy model:** every clinical/business entity is scoped by `organizationId`. Staff sessions carry org + roles via Auth.js JWT. Patients use a separate session model (`PatientSession`). Super Admin operates across orgs via `/api/super/*` and `/super` UI.

---

## 2. Module inventory

| Module | Schema models | API surface | UI | Maturity |
|--------|---------------|-------------|-----|----------|
| **Multi-tenant org & plans** | `Organization`, `Plan`, `Subscription`, `EntitlementOverride` | `/api/signup`, `/api/plan/*`, `/api/org/request-upgrade`, `/api/super/*` | Landing, Plan page, Super console | ★★★ Solid SaaS core |
| **Auth (staff)** | `User`, tokens on User | NextAuth + forgot/reset/verify | Login, verify, reset | ★★★ |
| **RBAC** | `Role`, `RolePermission`, `UserRole` | `/api/staff`, `/api/staff/roles` | Settings / staff | ★★★ Matrix + module gates |
| **Patients** | `Patient`, `EmergencyContact`, `PatientHistory`, encryption fields | `/api/patients`, history, archive | Patients list + detail | ★★★ PHI encryption optional |
| **Patient portal** | `PatientSession` | `/api/patient-auth/*`, `/api/patient-portal/*` | Patient login/portal | ★★ Partial (overview, not full self-serve) |
| **Appointments & scheduling** | `Appointment`, recurrence fields | `/api/appointments`, recurrence | Appointments calendar | ★★★ Conflicts + lifecycle |
| **Queue / walk-in** | token fields on Appointment | `/api/queue` | Queue page | ★★ |
| **Waitlist** | `WaitlistEntry` | `/api/waitlist` | Waitlist | ★★ Staff-only; no auto-offer |
| **Branches / rooms / equipment** | `Branch`, `Room`, `Equipment`, `AppointmentEquipment` | `/api/branches`, `/api/rooms` | Locations | ★★ Rooms CRUD; equipment thin |
| **Encounters / EMR** | `Encounter`, `EncounterNote`, `Vital`, `Diagnosis`, `FollowUp` | `/api/encounters`, notes, vitals | Encounters | ★★★ SOAP + lifecycle |
| **Prescriptions** | `Prescription`, `PrescriptionItem` | `/api/prescriptions` | Patient / print Rx | ★★ No e-prescribe network |
| **Labs / imaging orders** | `LabOrder`, `LabResult`, `ProcedureOrder` | `/api/lab-orders`, `/api/labs`, `/api/procedure-orders`, `/api/clinical-orders` | Labs | ★★ Report URL manual |
| **Catalogs** | `ServiceCatalog`, `ClinicalCatalog`, `PricingTier` | `/api/catalogs` | Catalogs | ★★★ |
| **Billing / payments** | `Invoice`, `InvoiceLineItem`, `Payment` | `/api/billing/invoices`, `/api/payments`, Stripe webhook | Billing, Payments | ★★★ Core; insurance claims thin |
| **Insurance** | `InsurancePolicy`, `InsuranceClaim` | (schema only / partial) | — | ★ Schema ahead of UI/API |
| **Inventory** | `InventoryItem`, `InventoryTransaction` | `/api/inventory` | Inventory | ★★ |
| **Communications** | `Communication`, `Campaign` | `/api/communications`, campaigns, reminders, scheduled | Communications, Campaigns | ★★ Queued; delivery tracking partial |
| **Notifications** | `Notification`, `PushSubscription` | `/api/notifications`, push | In-app + PWA push | ★★★ Recent |
| **Documents** | `Document` | `/api/documents`, `/api/uploads` | Documents | ★★★ Cloudinary HTTPS storage |
| **Consents** | `Consent` | `/api/consents` | Consents | ★★★ |
| **Tasks / automation** | `Task` + signals | `/api/tasks`, `/api/automation/signals` | Tasks, Automation | ★★ |
| **Analytics / reports** | derived | `/api/analytics/dashboard`, `/api/reports/monthly` | Analytics, Reports | ★★ |
| **Audit** | `AuditLog` | `/api/audit`, super audit | Audit | ★★★ Append-only pattern |
| **Integrations** | — | FHIR proxy, Stripe | — | ★★ Boundary only |
| **i18n** | dictionaries `en`/`ar` | cookie locale | Full RTL | ★★★ Differentiator |
| **PWA** | push subs | Serwist SW, offline mutations | Install / offline | ★★ New |

---

## 3. Directory map (source of truth)

| Path | Role |
|------|------|
| `prisma/schema.prisma` | Domain model |
| `prisma/migrations/` | SQL migrations |
| `src/app/(dashboard)/` | Staff UI pages |
| `src/app/api/` | ~77 route handlers |
| `src/lib/` | Domain services, authz, validations, plans, i18n |
| `src/components/` | Feature + UI primitives |
| `src/proxy.ts` | Edge middleware: auth, page RBAC, rate limits |
| `tests/unit/` | Vitest unit suite (~30 files) |
| `e2e/` | Playwright smoke |
| `docs/` | Entitlements + patient access design |

---

## 4. Incomplete / buggy / edge-case gaps

### 4.1 Features half-implemented

| Area | Gap |
|------|-----|
| **Document upload** | Real uploads via Cloudinary (`/api/uploads`) + document metadata; MIME/size allowlists. |
| **Insurance claims** | Models exist; no full CRUD/UI for claim lifecycle / clearinghouse. |
| **Patient self-booking** | No public booking page or availability slot engine for patients. |
| **Waitlist** | Create/list/update only; no auto-notify when a slot opens. |
| **Campaigns** | CRUD exists; drip execution / delivery analytics thin. |
| **FeedbackSurvey** | Model only — no API/UI. |
| **Equipment allocation** | Schema + join table; little first-class UI/API. |
| **Telehealth** | Appointment type may say telehealth; no video session provider. |
| **Cron jobs** | Reminder/scheduled communication routes exist; `vercel.json` lacks cron + `CRON_SECRET` hardening (called out in ops docs). |
| **Health endpoints** | No `/api/health` / readiness for orchestrators. |
| **Online booking payments** | Stripe for invoices; not deposit-at-booking. |

### 4.2 Validation gaps (routes without Zod `safeParse`)

Strong Zod coverage on: patients, appointments (update), encounters, labs, prescriptions, billing, payments, catalogs, branches/rooms, staff, signup, auth email flows, notifications, settings, clinical orders.

**Weaker / manual-only validation (priority to harden):**

- `POST /api/documents` — string presence only; no mime/type enum; no storage URL scheme check
- ` /api/waitlist`, `/api/tasks`, `/api/inventory`, `/api/communications`, `/api/consents`
- ` /api/queue`, `/api/audit`, `/api/analytics/*`, `/api/reports/*`
- Several `/api/super/*` mutation routes
- Cron-like public APIs under `PUBLIC_API_PREFIXES` (reminders/scheduled) — must stay secret-protected

**Appointment POST** still uses hand-rolled field checks for create (update path uses schema) — risk of inconsistent date/time parsing.

### 4.3 Database schema issues

**Missing / sparse indexes** (hot paths queried by `organizationId` alone or with status/time):

| Model | Suggested indexes |
|-------|-------------------|
| `Appointment` | `(organizationId, startTime)`, `(providerId, startTime, status)`, `(patientId, startTime)` |
| `Patient` | `(organizationId, status)`, `(organizationId, lastName)`, phone lookup |
| `Invoice` | `(organizationId, status)`, `(organizationId, createdAt)` |
| `Task` | `(organizationId, status, dueDate)`, `(assigneeId, status)` |
| `Communication` | `(organizationId, status, scheduledFor)` |
| `Document` | `(organizationId, patientId)`, `(organizationId, createdAt)` |
| `Encounter` | `(organizationId, patientId, startTime)` |
| `AuditLog` | `(organizationId, createdAt)`, `(entityType, entityId)` |
| `WaitlistEntry` | `(organizationId, status)` |
| `User` | `(organizationId, active)` |
| `Branch` / `Room` | `(organizationId, status)` |

**Other schema notes:**

- Many status/enums are free `String` — flexible but allows invalid states without DB constraints.
- `Patient.mrn` is globally `@unique` — should be `@@unique([organizationId, mrn])` for true multi-tenant.
- `Consent.organizationId` optional/denormalized — easy to forget in queries.
- `InsuranceClaim` has no `patientId` / `invoiceId` FK — hard to link claims to care.
- `FeedbackSurvey` orphaned (no org/patient relations enforced).
- Soft-delete: patients use `status=Archived`; hard deletes elsewhere may orphan clinical history depending on Prisma cascade (mostly no `onDelete: Cascade` — good for data safety, bad if UI “delete” assumes cleanup).

### 4.4 Security findings

| Severity | Finding |
|----------|---------|
| **High** | Cloudinary (and any) secrets must never be hardcoded — env only; rotate if pasted in chat/logs. |
| **High** | Patient login / session validation vs **suspended org** still a known gap (`NEXT_STEPS_PRODUCTION_READINESS.md`). |
| **High** | `ENCRYPTION_KEY` optional → PHI may be stored plaintext if unset in prod. |
| **Medium** | Rate limiter fails **open** if Redis errors; memory store is single-instance only. |
| **Medium** | Several APIs are public-prefixed for cron/webhooks — require shared secret verification (verify each). |
| **Medium** | Document `storageKey` previously trusted client-supplied URLs (open redirect / XSS risk if rendered unsafely). Prefer server-issued Cloudinary URLs. |
| **Low** | Demo seed + Docker defaults must stay off in production. |
| **OK** | Org scoping via `getOrgId` / `assertOrgScope` is consistent on clinic APIs. |
| **OK** | Permission checks (`requireAnyPermission` + module entitlements) widely used. |
| **OK** | `safe-logger` redacts emails/phones/tokens. |
| **OK** | Auth/signup rate limits in `proxy.ts`. |

### 4.5 Error handling & logging

- API routes generally: `try/catch` → `logServerError` → generic `{ error }` JSON (good — no stack leaks).
- Client: `logClientError` + sonner toasts on many dialogs.
- Gaps: inconsistent error codes (`400` vs `422`); little structured request-id correlation; no central Sentry/OpenTelemetry hook yet.
- No unified `AppError` taxonomy (authz vs validation vs conflict).

---

## 5. AuthZ flow (staff)

1. `proxy.ts` validates JWT for non-public routes; enforces page-level role map `CLINIC_PAGE_ACCESS`.
2. API handlers call `getOrgId()` + `requireAnyPermission` / `requireModulePermission`.
3. Entitlements (`src/lib/entitlements/*`) gate modules/features by plan + overrides.
4. Super Admin bypasses via role name in `hasPermission`.

---

## 6. Testing snapshot (see Phase 2)

- **Present:** Vitest unit tests under `tests/unit/` (~30 files covering validations, appointments lifecycle, billing helpers, entitlements, RBAC matrix, rate limit, i18n parity, documents filters, etc.).
- **Thin:** Playwright `e2e/smoke.spec.ts` only.
- **Missing:** true API integration tests against a test DB; tenant-isolation suites; webhook signature tests.

---

## 7. Production-readiness checklist (condensed)

- [ ] Force `ENCRYPTION_KEY` + `NEXTAUTH_SECRET` in production boot
- [ ] Suspended-org patient session rejection
- [ ] Cron + `CRON_SECRET` for reminders
- [ ] `/api/health` + `/api/ready`
- [ ] Redis rate limit in all prod replicas
- [ ] Real media storage (Cloudinary) + MIME allowlists
- [ ] Schema indexes + MRN tenant uniqueness migration
- [ ] Integration + E2E expansion
- [ ] Observability (errors, metrics, uptime)
- [ ] Backup/restore + secret rotation runbooks

---

## 8. Recommended build order after this audit

1. **Cloudinary uploads** (Phase 4) — unblock real documents/imaging  
2. **Security harden** — encryption, patient sessions, cron secrets  
3. **Schema indexes + MRN uniqueness**  
4. **Zod on remaining write APIs**  
5. **Integration tests + expand E2E**  
6. **Must-have product gaps** from `FEATURE_RESEARCH.md` (self-booking, reminder reliability, portal depth)

---

*This file is the living architecture map for the “عيادات CRM” workspace. Prefer updating it when modules land or audit findings close.*
