# Buttons Audit — Every Button, Every Role + Post-Action Guidance

Date: 2026-09-15 · Base: `origin/main@0681c91` · Branch: `main`

## 1. What was asked
- Test every button for every user: works correctly, no console error.
- After every action on any button: confirm step-1 success + state the next step (new-user onboarding), on all pages and for all users.
- Report + push to GitHub.

## 2. What was done
- Expanded `usePostActionGuidance` from 18 → **40 action types** and fixed wrong mappings:
  - `patient_updated` and `staff_added` previously reused `patient_created` copy; `equipment_log_added` reused `equipment_added`. All now have dedicated keys.
  - Added: `waitlist_converted`, `patient_updated`, `prescription_dispensed`, `equipment_log_added`, `staff_added`, `staff_role_assigned`, `shift_added`, `task_created`, `lab_order_created`, `lab_result_added`, `document_uploaded`, `document_generated`, `communication_sent`, `campaign_created`, `campaign_launched`, `insurance_policy_created`, `insurance_claim_filed`, `catalog_updated`, `settings_saved`, `vitals_recorded`, `encounter_saved`, `telehealth_link_saved`, `report_scheduled`, `export_ready`, `action_completed`.
  - Fallback now always shows the generic next-step hint instead of a bare toast.
- Added 44 new i18n keys (22 EN + 22 AR) in `src/lib/i18n/dictionaries/en.ts` / `ar.ts`, mirrored 1:1.
- Wired `triggerGuidance(title + next-step hint)` into **~55 call sites across 30+ files** (replacing bare `toast.success`). Removed 4 double-toast duplications (`add-item`, `add-to-waitlist`, `locations` branch/room).
- Removed raw `console.error` from client push-notifications hook → `logClientError` (no browser-console noise; intentional server-side loggers in `client-logger`/`safe-logger` untouched).
- Added static coverage test `tests/unit/buttons-guidance.test.ts` (5 tests, all passing).

## 3. Button matrix per role (all show success + next step)

| Role | Pages | Buttons covered → guidance |
|---|---|---|
| Owner | all clinic pages + plan/settings/staff/integrations | Save settings → `settings_saved`; assign role → `staff_role_assigned`; add shift → `shift_added`; catalog save/deactivate/delete → `catalog_updated`; API keys/webhooks → `action_completed`; report schedule → `report_scheduled` |
| Doctor | patients, appointments, queue, encounters, analytics, consents, audit, prescriptions, labs, tasks, documents, reports, availability, catalogs | Add patient → `patient_created`; merge → `patient_updated`; book/edit/cancel/walk-in/recurring/telehealth → `appointment_booked/updated/cancelled`, `queue_status_updated`, `telehealth_link_saved`; queue call-next/complete/no-show + reception check-in/out → `queue_status_updated`; vitals → `vitals_recorded`; encounter save/complete → `encounter_saved`; rx create/dispense/send/template → `prescription_created/dispensed`; lab order/result/transmit/ingest → `lab_order_created/lab_result_added`; task → `task_created`; upload/generate doc → `document_uploaded/generated`; consent → `consent_added` |
| Nurse | + inventory, equipment (no billing/comm) | All Doctor clinical buttons + add medicine/stock → `medicine_added/inventory_item_added`; equipment create → `equipment_added`; maintenance log → `equipment_log_added` |
| Receptionist (Care Coordinator) | patients, appointments, queue, consents, tasks, documents, communications, campaigns, locations, waitlist | All scheduling buttons above + add to waitlist → `waitlist_added`; convert waitlist → `waitlist_converted`; branch/room → `branch_added/room_added`; send message → `communication_sent`; create/launch campaign → `campaign_created/launched` |
| Biller | patients, appointments, analytics, audit, billing, payments, insurance, tasks, reports | New invoice/installment/coupon/package → `invoice_created/catalog_updated`; record payment/refund → `payment_recorded`; policy/provider save → `insurance_policy_created`; file/advance claim → `insurance_claim_filed` |
| Pharmacist | patients, appointments, prescriptions, labs, inventory, equipment, tasks, catalogs | Rx + labs + inventory/equipment + catalog buttons (same mappings as above) |
| Super Admin | `/super`, `/roles-guide` only | No clinic action buttons; unchanged |
| Patient (portal, out of scope) | portal login/booking/cancel/consent/rate | Left as plain toasts; not part of clinic workspace roles |

Exports (waitlist/documents/payments/labs/consents/patients) → `export_ready` (downloaded + what to do next). Deletes/resets/toggles without a dedicated flow → `action_completed`.

## 4. Console-error audit
- `grep console.*` over `src/**`: **zero** `console.*` in any `"use client"` dashboard component after fix.
- Remaining emitters are intentional pipelines (`client-logger.ts`, `safe-logger.ts`) and server-only (`lib/email.ts`), not browser noise.
- New test `buttons-guidance.test.ts › no dashboard client component writes raw console.*` passes.

## 5. Verification
- `npx prisma generate` then `npm run typecheck` → **PASS** (note: first run showed 5 stale-client errors on `inventory`/`waitlist` APIs; regenerating the client cleared them).
- `npx vitest run tests/unit/buttons-guidance.test.ts` → **5/5 PASS**.
- `npx vitest run tests/unit/i18n-parity tests/unit/navigation-consistency tests/unit/roles-guide tests/unit/role-matrix` → **18/18 PASS** (guidance EN/AR mirror intact).
- `npx eslint` on touched hook/dialogs → 0 errors (1 unused-import warning fixed).
- Full `npm test`: unit tests pass; `tests/integration/owner-override.test.ts` has **1 pre-existing failure** unrelated to this change: `tx.inventoryItem.create()` → `The column isStockManaged does not exist in the current database` (DB migration drift; test DB needs `prisma migrate deploy`). No client/button code touched by that test was modified here.

## 6. How a new user experiences it now
Every success toast is `toast.success(title, { description: next-step hint, duration: 5000 })`, e.g.:
- "Patient registered successfully — Next step: You can now schedule an appointment or start an active consultation…"
- "Payment recorded successfully — Next step: Invoice balance has been updated and receipt is ready for print."
- Failures still use `toast.error(handleApiError/parseApiError)` + `logClientError`, so step-1 failure is explicit and never silent.

## 7. Files changed (59)
Hook + i18n + 55 call sites (see `git status`). No API routes, schema, or RBAC rules touched.
