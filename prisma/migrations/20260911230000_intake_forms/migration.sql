-- P1#6: digital intake forms. ADDITIVE ONLY — three new (empty) tables.
-- Clinics define visit forms (Arabic + English labels, typed fields);
-- patients answer from the portal before visits; staff read responses in
-- the patient's record. Answers are validated server-side against the
-- form's required fields (see src/lib/intake.ts).

-- CreateTable
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelAr" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeResponse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "answers" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntakeForm_organizationId_active_idx" ON "IntakeForm"("organizationId", "active");
CREATE UNIQUE INDEX "IntakeField_formId_key_key" ON "IntakeField"("formId", "key");
CREATE INDEX "IntakeField_formId_position_idx" ON "IntakeField"("formId", "position");
CREATE INDEX "IntakeResponse_organizationId_formId_idx" ON "IntakeResponse"("organizationId", "formId");
CREATE INDEX "IntakeResponse_patientId_formId_idx" ON "IntakeResponse"("patientId", "formId");

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntakeField" ADD CONSTRAINT "IntakeField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
