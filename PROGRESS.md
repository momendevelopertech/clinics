# Progress Log — عيادات CRM Production Readiness

## Current status
- Last updated: 2026-09-11 13:23 UTC+3
- Current phase: P5 — Should-have Features (**COMPLETE: all 6 tasks DONE — media in P2, intake, waitlist, insurance, analytics, online payment — tsc clean**)
- Current task: Final verification + push
- Status: READY

## How to resume
لو الـ session اتقطع، اقرأ الملف ده الأول، شوف "Current task"، تحقق من حالته الفعلية في الكود (هل اتنفذ فعلاً ولا لأ)، وكمل من هناك. لا تعيد تنفيذ تاسكات مكتوب جنبها [x].

التالي: تحقق نهائي ودفع.

Previous clinic-blueprint tracker (P0–P7 product modules) lived in this file and is largely complete except P4-T3 charge-generation policy (blocked on product decision). Do not confuse that list with the production-readiness tasks in `TASKS.md`.

## Task log
| # | Task | Phase | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Build unified TASKS.md | 0 | DONE | Merged ARCHITECTURE §4–§8, TESTING_PLAN, FEATURE_RESEARCH §3 into P0–P5. |
| 2 | Force ENCRYPTION_KEY + NEXTAUTH_SECRET on production boot | P0 | DONE | `src/lib/boot-env.ts` + `src/instrumentation.ts`. Fails if missing, <32 chars, or placeholder. Dev unchanged. Tests: `tests/unit/boot-env.test.ts` (11 with crypto). |
| 3 | Reject patient sessions when the organization is suspended | P0 | DONE (verified, pre-existing) | Gate already in `src/lib/patient-auth.ts` (`isPatientOrganizationActive`, `findActivePatientSession` org filter) + login reject in `src/app/api/patient-auth/login/route.ts`; all resolvers via `getPatientSessionFromRequest`, no bypasses. Tests: `tests/unit/patient-auth.test.ts` 3/3 green. Marked `[x]` in TASKS.md. |
| 4 | Scope `Patient.mrn` uniqueness per organization | P0 | DONE + APPLIED | Migration `20260910223000_scoped_patient_mrn_unique` applied to Neon via `migrate deploy` (`migrate status`: up to date); DB-verified: `Patient_organizationId_mrn_key` UNIQUE on ("organizationId", mrn) exists, 0 duplicate pairs. Seeds switched to `organizationId_mrn` upsert. 7/7 patient tests green. |
| 8 | P0 full verification (all 6 tasks) | P0 | DONE | Full unit suite: **35 files / 181 tests green** (`npx vitest run`). Boot gate wired via `src/instrumentation.ts`. `vercel.json` crons (hourly reminders, minutely scheduled) match `CRON_SECRET` Bearer guard. No commit (tree shared with concurrent P1/Cloudinary work). |
| 5 | Rate limiter fail-closed when Redis is unavailable | P0 | DONE (verified) | `takeRateLimitToken` catch returns `allowed:false` ("failing closed"); enforced in `proxy.ts` → 429 with Retry-After; no other fail-open paths (single store entry point). Tests: `tests/unit/rate-limit.test.ts` 17/17 green. Marked `[x]` in TASKS.md. |
| 6 | Protect public cron/webhook endpoints with CRON_SECRET | P0 | DONE (verified) | `authorizeCronRequest` (`src/lib/cron-auth.ts`): 503 if unconfigured, 401 on mismatch, `x-cron-secret`/`Bearer`; wired into `communications/scheduled` + `appointment-reminders`; Stripe webhook = signature verification equivalent; `CRON_SECRET` added to `.env.example`; stale fail-open comment fixed. Tests: `tests/unit/cron-auth.test.ts` 3/3 green. Marked `[x]` in TASKS.md. |
| 7 | Add `/api/health` and `/api/ready` | P0 | DONE (verified) | Liveness `src/app/api/health/route.ts` (`{status:"ok"}`, no deps); readiness `src/app/api/ready/route.ts` (DB `SELECT 1` → 200/503, no secrets); both `force-dynamic` + public in `proxy.ts`. Tests: `tests/unit/health.test.ts` 3/3 green. Marked `[x]` in TASKS.md. P0 COMPLETE. |
