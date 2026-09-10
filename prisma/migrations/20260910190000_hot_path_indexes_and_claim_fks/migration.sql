-- Additive indexes only. Does not rewrite or delete existing rows.

-- Appointment hot paths
CREATE INDEX IF NOT EXISTS "Appointment_organizationId_startTime_idx" ON "Appointment"("organizationId", "startTime");
CREATE INDEX IF NOT EXISTS "Appointment_providerId_startTime_status_idx" ON "Appointment"("providerId", "startTime", "status");
CREATE INDEX IF NOT EXISTS "Appointment_patientId_startTime_idx" ON "Appointment"("patientId", "startTime");

-- Patient
CREATE INDEX IF NOT EXISTS "Patient_organizationId_status_idx" ON "Patient"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Patient_organizationId_lastName_idx" ON "Patient"("organizationId", "lastName");
CREATE INDEX IF NOT EXISTS "Patient_organizationId_phone_idx" ON "Patient"("organizationId", "phone");

-- User / location
CREATE INDEX IF NOT EXISTS "User_organizationId_active_idx" ON "User"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "Branch_organizationId_status_idx" ON "Branch"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Room_organizationId_status_idx" ON "Room"("organizationId", "status");

-- Encounter / waitlist
CREATE INDEX IF NOT EXISTS "Encounter_organizationId_patientId_startTime_idx" ON "Encounter"("organizationId", "patientId", "startTime");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_organizationId_status_idx" ON "WaitlistEntry"("organizationId", "status");

-- Billing
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_status_idx" ON "Invoice"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_createdAt_idx" ON "Invoice"("organizationId", "createdAt");

-- InsuranceClaim optional FKs (nullable; existing rows stay unlinkable until filled)
ALTER TABLE "InsuranceClaim" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE "InsuranceClaim" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;

CREATE INDEX IF NOT EXISTS "InsuranceClaim_organizationId_status_idx" ON "InsuranceClaim"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "InsuranceClaim_patientId_idx" ON "InsuranceClaim"("patientId");
CREATE INDEX IF NOT EXISTS "InsuranceClaim_invoiceId_idx" ON "InsuranceClaim"("invoiceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InsuranceClaim_patientId_fkey'
  ) THEN
    ALTER TABLE "InsuranceClaim"
      ADD CONSTRAINT "InsuranceClaim_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InsuranceClaim_invoiceId_fkey'
  ) THEN
    ALTER TABLE "InsuranceClaim"
      ADD CONSTRAINT "InsuranceClaim_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Tasks / communications / documents / audit
CREATE INDEX IF NOT EXISTS "Task_organizationId_status_dueDate_idx" ON "Task"("organizationId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "Communication_organizationId_status_scheduledFor_idx" ON "Communication"("organizationId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "Document_organizationId_patientId_idx" ON "Document"("organizationId", "patientId");
CREATE INDEX IF NOT EXISTS "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
