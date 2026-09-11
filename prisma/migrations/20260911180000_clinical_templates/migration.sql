-- P1#1: clinical note templates per specialty. ADDITIVE ONLY — one new
-- (empty) table. Doctors document faster by prefilling SOAP sections;
-- the composer only fills fields the doctor left empty.

-- CreateTable
CREATE TABLE "ClinicalTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "noteType" TEXT NOT NULL DEFAULT 'soap',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalTemplate_organizationId_specialty_idx" ON "ClinicalTemplate"("organizationId", "specialty");

-- AddForeignKey
ALTER TABLE "ClinicalTemplate" ADD CONSTRAINT "ClinicalTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
