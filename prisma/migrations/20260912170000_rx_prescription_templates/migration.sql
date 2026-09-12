-- Per-doctor prescription templates (personal + optionally shared clinic-wide).
CREATE TABLE "PrescriptionTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "items" JSONB NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrescriptionTemplate_organizationId_createdById_idx" ON "PrescriptionTemplate"("organizationId", "createdById");

ALTER TABLE "PrescriptionTemplate" ADD CONSTRAINT "PrescriptionTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrescriptionTemplate" ADD CONSTRAINT "PrescriptionTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;