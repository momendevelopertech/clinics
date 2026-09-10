-- Scope Patient.mrn uniqueness per organization (P0: Security & Data Integrity).
--
-- SAFE: the previous global UNIQUE INDEX on "mrn" guarantees that every
-- non-NULL mrn value is distinct across the whole table, so no two rows in
-- the same organization can share an mrn and this migration cannot fail on
-- data. PostgreSQL treats NULLs as distinct in unique indexes, so patients
-- without an mrn are unaffected (same as before).

DROP INDEX IF EXISTS "Patient_mrn_key";

CREATE UNIQUE INDEX "Patient_organizationId_mrn_key" ON "Patient"("organizationId", "mrn");
