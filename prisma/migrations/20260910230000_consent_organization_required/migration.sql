-- Make Consent.organizationId required (P1: Schema & Validation Hardening).
--
-- All consent reads/writes are scoped by organizationId, and POST always sets
-- it, so NULL rows are unreachable dead data. Backfill defensively from the
-- patient's org first, drop any still-NULL rows (no patient to inherit from),
-- then enforce NOT NULL.

UPDATE "Consent" c
SET "organizationId" = p."organizationId"
FROM "Patient" p
WHERE c."organizationId" IS NULL AND p.id = c."patientId";

DELETE FROM "Consent" WHERE "organizationId" IS NULL;

ALTER TABLE "Consent" ALTER COLUMN "organizationId" SET NOT NULL;
