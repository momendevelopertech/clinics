CREATE TABLE "ProcedureOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "orderedById" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "procedureName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcedureOrder_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Document" ADD COLUMN "procedureOrderId" TEXT;
ALTER TABLE "ProcedureOrder" ADD CONSTRAINT "ProcedureOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcedureOrder" ADD CONSTRAINT "ProcedureOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcedureOrder" ADD CONSTRAINT "ProcedureOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProcedureOrder" ADD CONSTRAINT "ProcedureOrder_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcedureOrder" ADD CONSTRAINT "ProcedureOrder_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_procedureOrderId_fkey" FOREIGN KEY ("procedureOrderId") REFERENCES "ProcedureOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ProcedureOrder_organizationId_patientId_status_idx" ON "ProcedureOrder"("organizationId", "patientId", "status");
