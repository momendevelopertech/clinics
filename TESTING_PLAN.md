# Testing Plan — عيادات CRM

**Framework in use:** Vitest (unit) · Playwright (e2e smoke)  
**Current state (Sep 2026):** ~30+ unit files under `tests/unit/`; e2e limited to `e2e/smoke.spec.ts`. **No DB-backed API integration suite yet.**

---

## 1. Coverage today

| Layer | Status |
|-------|--------|
| Unit — validations, appointments, billing helpers, entitlements, RBAC matrix, rate limit, i18n parity, documents filters, crypto, cloudinary upload rules | **Present** |
| Integration — real HTTP + Prisma test DB | **Absent** |
| E2E — full clinic journeys | **Smoke only** |

Run:

```bash
npm test
npm run test:e2e
```

---

## 2. Target pyramid

### A. Unit (keep expanding)

- Business logic in `src/lib/*` (appointments, plans, entitlements, automation, pagination).
- Zod schemas (happy + invalid).
- Pure UI helpers (document filters, role labels).
- Cloudinary validation / folder scoping / config detection (`tests/unit/cloudinary-uploads.test.ts`).
- Clinic edge cases (`tests/unit/clinic-edge-cases.test.ts`).

### B. Integration (next priority — not yet scaffolded)

Use Vitest + a disposable Postgres (Docker or Neon branch) with `DATABASE_URL` override:

| Suite | Cases |
|-------|-------|
| Auth | 401 without session; 403 wrong role; suspended org |
| Patients CRUD | create/read/update/archive; tenant isolation (org A ≠ org B) |
| Appointments | conflict 409; invalid transition; doctor outside hours |
| Billing | invoice create; payment; Stripe webhook signature fail/duplicate |
| Documents | upload authz; reject bad MIME; HTTPS storageKey only |
| Patient portal | revoked/expired session; cannot see other patients |
| Super admin | non-super blocked from `/api/super/*` |
| Entitlements | free plan module lock; override unlock |

### C. E2E (Playwright)

| Journey | Roles |
|---------|-------|
| Owner signup → staff invite → book appointment | Owner, Receptionist |
| Doctor encounter → Rx → lab order | Doctor |
| Biller invoice → mark paid | Biller |
| Patient portal view upcoming appointment | Patient |
| Permission denied pages for wrong role | Receptionist on `/billing` |

---

## 3. Clinic-specific edge cases checklist

- [x] Provider double-booking conflict detection (unit)
- [x] Illegal appointment status transitions (unit)
- [x] Regular vs on-call availability (unit)
- [ ] Deleting/archiving patient retains clinical history (integration)
- [ ] Receptionist cannot complete encounter notes (integration)
- [ ] Branch-scoped staff cannot see other branch schedules if policy enabled (future)
- [ ] Waitlist entry cannot reference foreign-org patient (integration)
- [ ] Concurrent walk-in token uniqueness (integration)

---

## 4. Definition of done for “production test readiness”

1. `npm test` green in CI on every PR.  
2. Integration suite covering tenant isolation + role 401/403 for top 10 write APIs.  
3. Playwright smoke for login + dashboard + one booking path.  
4. Critical path coverage documented in this file when suites land.

---

*Started expanding unit coverage in Phase 2 of the Sep 2026 production-ready pass.*
