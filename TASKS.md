# TASKS — عيادات CRM Production Readiness

Unified backlog from `ARCHITECTURE.md` §4–§8, `TESTING_PLAN.md`, and `FEATURE_RESEARCH.md` §3 / §5.  
Execute **one task at a time**, top to bottom. Mark `[x]` only after tests for that task pass.

---

## P0 — Security & Data Integrity

- [x] Force `ENCRYPTION_KEY` + `NEXTAUTH_SECRET` on production boot (fail loudly if empty/placeholder) — Phase P0
- [x] Reject patient sessions when the organization is suspended — Phase P0 (verified: `isPatientOrganizationActive` + `findActivePatientSession` org gate in `src/lib/patient-auth.ts`, login rejects in `src/app/api/patient-auth/login/route.ts`, all resolvers via `getPatientSessionFromRequest`; tests `tests/unit/patient-auth.test.ts` 3/3 green)
- [x] Change `Patient.mrn` from global `@unique` to `@@unique([organizationId, mrn])` with a safe data migration — Phase P0 (done + APPLIED to Neon via `migrate deploy`: `Patient_organizationId_mrn_key` confirmed in DB, 0 duplicate pairs; seeds switched to `organizationId_mrn`; `prisma validate` + `generate` OK, 7/7 patient unit tests green)
- [x] Rate limiter fail-closed when Redis is unavailable (no fail-open) — Phase P0 (done in tree: `takeRateLimitToken` catch in `src/lib/rate-limit.ts` returns `allowed:false` + logs "failing closed"; single enforcement point via `proxy.ts` → 429; tests `tests/unit/rate-limit.test.ts` 17/17 green)
- [x] Protect public cron/webhook endpoints with `CRON_SECRET` (or equivalent) — Phase P0 (done in tree: `authorizeCronRequest` in `src/lib/cron-auth.ts` — 503 if unconfigured, 401 on wrong secret, accepts `x-cron-secret`/`Bearer`; wired into both cron routes; Stripe webhook uses signature verification as equivalent; `CRON_SECRET` documented in `.env.example`; tests `tests/unit/cron-auth.test.ts` 3/3 green)
- [x] Add `/api/health` and `/api/ready` — Phase P0 (done in tree: liveness `src/app/api/health/route.ts` returns `{status:"ok"}` with no dependency checks; readiness `src/app/api/ready/route.ts` pings DB via `evaluateReadiness` → 200/503 with no secrets; both `force-dynamic` + public in `proxy.ts`; tests `tests/unit/health.test.ts` 3/3 green)

## P1 — Schema & Validation Hardening

- [x] Add audit §4.3 indexes (Appointment, Patient, Invoice, Task, Communication, Document, Encounter, AuditLog, WaitlistEntry, User, Branch/Room) — Phase P1 (done in tree + APPLIED: `20260910190000_hot_path_indexes_and_claim_fks` idempotent `IF NOT EXISTS`; DB-verified 24/24 indexes incl. `Patient_organizationId_mrn_key`)
- [x] Add Zod validation for remaining write/list routes (waitlist, tasks, inventory, communications, consents, queue, audit, analytics, reports, super) — Phase P1 (audited all: central schemas in `src/lib/validations/ops.ts` cover waitlist/tasks/inventory/communications/consents/audit/reports; queue+analytics take no input; fixed 3 gaps — `consents/[id]` PATCH now uses new `consentUpdateSchema`, `super/audit` query + `super/orgs/[orgId]/plan` body now Zod-validated; tests 182/182 green)
- [x] Align appointment POST with the same Zod schema used on update — Phase P1 (verified in tree: shared `appointmentStatusSchema`, create schema accepts both `date+time` and ISO shapes matching route logic; `tests/unit/validations.test.ts` green)
- [x] Link `InsuranceClaim` to `patientId` / `invoiceId` via FKs — Phase P1 (done in tree + APPLIED: nullable FKs `ON DELETE SET NULL`, DB-verified both constraints; relations + indexes in schema)
- [x] Make `Consent.organizationId` required (not optional) — Phase P1 (done + APPLIED: backfill-from-patient + `SET NOT NULL` in `20260910230000_consent_organization_required`; DB-verified 25/25 intact, column NOT NULL; all consent queries already org-scoped)

## P2 — Cloudinary & Media

- [x] Route all image/document uploads through the central Cloudinary service — Phase P2 (verified: single multipart path `POST /api/uploads`; no local writes; avatar/logo/document dialogs all use it; LIVE upload+destroy verified against dev cloud, zero residue)
- [x] Enforce MIME/size allowlist on every upload path — Phase P2 (verified: `validateUploadBuffer` + per-purpose `ALLOWED_MIME_BY_PURPOSE` + 10MB cap enforced in service; 16/16 cloudinary tests green)
- [x] Destroy Cloudinary assets when the linked record is deleted — Phase P2 (done + APPLIED: `User.avatarPublicId` + `Document.publicId` columns via `20260910233000_media_public_ids`; `destroyCloudinaryAssetSafe` best-effort cleanup on avatar/logo replace in `profile/avatar` + `settings` PATCH; no hard-delete endpoints exist so replace is the only orphan path)
- [x] Reject client-supplied `storageKey`; persist only server-issued URLs — Phase P2 (done: `documentCreateSchema.storageKey` now requires Cloudinary delivery shape `res.cloudinary.com/.../upload/...`; evil-subdomain/non-cloud URLs rejected; dialog posts only `/api/uploads` URLs)

## P3 — Testing

- [ ] Integration suite: Auth, Patients CRUD + tenant isolation, Appointments conflicts, Billing + webhook idempotency, Documents, Patient portal, Super admin, Entitlements — Phase P3 (IN PROGRESS: `tests/integration/tenant-isolation.test.ts` green on dev DB — org leak check + per-org MRN P2002 with rollback, zero residue; webhook idempotency covered at unit level; full API-level suites for Auth/Billing/Super/Entitlements still need a CI test DB. Run: `npx vitest run tests/integration`)
- [x] Security regression tests: rate limiter fail-closed, webhook idempotency, encryption-key boot check — Phase P3 (done: `rate-limit.test.ts` 17/17, NEW `shouldApplyPaymentEvent` in `src/lib/webhooks.ts` wired into Stripe success/failure handlers — duplicate `payment_intent.succeeded` no longer double-credits invoices — tested in `billing.test.ts`, `boot-env.test.ts` 7/7)
- [ ] Playwright journeys: owner signup→book; doctor encounter→Rx→lab; biller pay; patient portal; receptionist denied `/billing` — Phase P3 (WRITTEN: `e2e/journeys.spec.ts` — API-assisted, idempotent keys, seeded accounts; NOT yet executed — needs seeded app + browsers; biller journey needs Stripe test key; run: `npm run test:e2e`)
- [ ] Confirm `npm test` and `npm run test:e2e` are green in CI — Phase P3 (PARTIAL: `.github/workflows/ci.yml` added — unit job green-guaranteed 190/190 on push/PR; e2e job nightly/manual requiring E2E_* secrets; e2e not yet run green anywhere)

## P4 — Must-have Features

- [x] Patient self-booking: availability engine + public booking page — Phase P4 (done: pure `getAvailableSlots` engine 8/8 tests; public `GET /api/book/[orgSlug]/availability` + patient-session `POST .../appointments` with conflict tx + idempotency; 30/min IP rate limit; public `/book/[orgSlug]` page + portal quick-action link; proxy allowlists `/book` page+API; i18n en+ar)
- [x] Reliable reminders (SMS + WhatsApp + Email) with hardened cron — Phase P4 (done: status filter scheduled/confirmed only, archived/suspended skipped, all 3 channels with per-channel sent/failed records + audits, failure counts in response; tested `tests/unit/reminders.test.ts`)
- [x] Deeper patient portal (documents, invoices, cancel/reschedule) — Phase P4 (done: patient-scoped documents/invoices endpoints; cancel + reschedule endpoints with ownership/transition/conflict guards; portal UI cards + per-appointment actions; pure `canPatientCancel/Reschedule` guards tested; i18n en+ar)
- [ ] No-show / cancellation policy tracking — Phase P4

## P5 — Should-have Features

- [ ] Digital intake / consent forms (Arabic + mobile-friendly) — Phase P5
- [ ] Waitlist auto-offer on cancellation — Phase P5
- [ ] Insurance workflow: policy → eligibility → claim → invoice — Phase P5
- [ ] Analytics pack: attendance, revenue, new vs returning — Phase P5
- [ ] Online payment / deposit at booking — Phase P5
- [ ] Staff & clinic profile media via Cloudinary — Phase P5
