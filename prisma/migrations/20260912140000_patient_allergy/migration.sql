-- Structured patient allergies replacing the free-text column.
CREATE TABLE "PatientAllergy" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId"      TEXT NOT NULL,
  "allergen"       TEXT NOT NULL,
  "severity"       TEXT,
  "reaction"       TEXT,
  "onset"          TIMESTAMPTZ,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientAllergy_organization_patient_idx"
  ON "PatientAllergy"("organizationId", "patientId");

ALTER TABLE "PatientAllergy"
  ADD CONSTRAINT "PatientAllergy_organization_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientAllergy"
  ADD CONSTRAINT "PatientAllergy_patient_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;