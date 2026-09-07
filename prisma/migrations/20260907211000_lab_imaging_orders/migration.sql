CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "orderedById" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'routine',
    "indication" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LabResult" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "LabResult" ADD COLUMN "orderId" TEXT;
ALTER TABLE "LabResult" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "LabResult" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "LabResult" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "LabResult" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "LabResult" r SET "organizationId" = p."organizationId" FROM "Patient" p WHERE p."id" = r."patientId";
ALTER TABLE "LabResult" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "LabOrder_organizationId_patientId_status_idx" ON "LabOrder"("organizationId", "patientId", "status");
