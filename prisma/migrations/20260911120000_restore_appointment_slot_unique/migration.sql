-- Restore the double-booking backstop dropped by
-- 20260907131422_add_branches_and_rooms (which ran DROP INDEX
-- "appointment_active_slot_unique").
--
-- Partial unique index: at most one ACTIVE appointment per (providerId, startTime).
-- Active statuses mirror ACTIVE_STATUSES in src/lib/appointments.ts and the status
-- enum in src/lib/validations/appointment.ts:
--   scheduled, confirmed, arrived, in_progress.
-- Terminal statuses (completed, cancelled, no_show) are excluded so a slot can be
-- reused after completion/cancellation, and walk-ins keep working (tokenNumber).
--
-- DATA IMPACT: DDL only — no rows are inserted, updated, or deleted.
-- The statement fails closed (migration aborts, nothing applied) if duplicate
-- ACTIVE rows already exist for the same (providerId, startTime). Before deploying,
-- run this verification query (must return zero rows):
--   SELECT "providerId", "startTime", COUNT(*)
--   FROM "Appointment"
--   WHERE "status" IN ('scheduled', 'confirmed', 'arrived', 'in_progress')
--   GROUP BY "providerId", "startTime"
--   HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX "appointment_active_slot_unique"
ON "Appointment" ("providerId", "startTime")
WHERE "status" IN ('scheduled', 'confirmed', 'arrived', 'in_progress');
