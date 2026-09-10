# TASKS — عيادات CRM Production Readiness

Unified backlog from `ARCHITECTURE.md` §4–§8, `TESTING_PLAN.md`, and `FEATURE_RESEARCH.md` §3 / §5.  
Execute **one task at a time**, top to bottom. Mark `[x]` only after tests for that task pass.

---

## P0 — Security & Data Integrity

- [x] Force `ENCRYPTION_KEY` + `NEXTAUTH_SECRET` on production boot (fail loudly if empty/placeholder) — Phase P0
- [ ] Reject patient sessions when the organization is suspended — Phase P0
- [ ] Change `Patient.mrn` from global `@unique` to `@@unique([organizationId, mrn])` with a safe data migration — Phase P0
- [ ] Rate limiter fail-closed when Redis is unavailable (no fail-open) — Phase P0
- [ ] Protect public cron/webhook endpoints with `CRON_SECRET` (or equivalent) — Phase P0
- [ ] Add `/api/health` and `/api/ready` — Phase P0

## P1 — Schema & Validation Hardening

- [ ] Add audit §4.3 indexes (Appointment, Patient, Invoice, Task, Communication, Document, Encounter, AuditLog, WaitlistEntry, User, Branch/Room) — Phase P1
- [ ] Add Zod validation for remaining write/list routes (waitlist, tasks, inventory, communications, consents, queue, audit, analytics, reports, super) — Phase P1
- [ ] Align appointment POST with the same Zod schema used on update — Phase P1
- [ ] Link `InsuranceClaim` to `patientId` / `invoiceId` via FKs — Phase P1
- [ ] Make `Consent.organizationId` required (not optional) — Phase P1

## P2 — Cloudinary & Media

- [ ] Route all image/document uploads through the central Cloudinary service — Phase P2
- [ ] Enforce MIME/size allowlist on every upload path — Phase P2
- [ ] Destroy Cloudinary assets when the linked record is deleted — Phase P2
- [ ] Reject client-supplied `storageKey`; persist only server-issued URLs — Phase P2

## P3 — Testing

- [ ] Integration suite: Auth, Patients CRUD + tenant isolation, Appointments conflicts, Billing + webhook idempotency, Documents, Patient portal, Super admin, Entitlements — Phase P3
- [ ] Security regression tests: rate limiter fail-closed, webhook idempotency, encryption-key boot check — Phase P3
- [ ] Playwright journeys: owner signup→book; doctor encounter→Rx→lab; biller pay; patient portal; receptionist denied `/billing` — Phase P3
- [ ] Confirm `npm test` and `npm run test:e2e` are green in CI — Phase P3

## P4 — Must-have Features

- [ ] Patient self-booking: availability engine + public booking page — Phase P4
- [ ] Reliable reminders (SMS + WhatsApp + Email) with hardened cron — Phase P4
- [ ] Deeper patient portal (documents, invoices, cancel/reschedule) — Phase P4
- [ ] No-show / cancellation policy tracking — Phase P4

## P5 — Should-have Features

- [ ] Digital intake / consent forms (Arabic + mobile-friendly) — Phase P5
- [ ] Waitlist auto-offer on cancellation — Phase P5
- [ ] Insurance workflow: policy → eligibility → claim → invoice — Phase P5
- [ ] Analytics pack: attendance, revenue, new vs returning — Phase P5
- [ ] Online payment / deposit at booking — Phase P5
- [ ] Staff & clinic profile media via Cloudinary — Phase P5
