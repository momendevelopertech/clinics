-- P2#7: equipment maintenance log + calibration alerts

ALTER TABLE "Equipment"
  ADD COLUMN "lastCalibrationAt" TIMESTAMP(3),
  ADD COLUMN "nextCalibrationAt" TIMESTAMP(3),
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

CREATE TABLE "EquipmentMaintenance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "description" TEXT,
    "technician" TEXT,
    "performedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EquipmentMaintenance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EquipmentMaintenance_organizationId_equipmentId_dueAt_idx"
    ON "EquipmentMaintenance"("organizationId", "equipmentId", "dueAt");

CREATE INDEX "EquipmentMaintenance_organizationId_status_dueAt_idx"
    ON "EquipmentMaintenance"("organizationId", "status", "dueAt");

ALTER TABLE "EquipmentMaintenance"
    ADD CONSTRAINT "EquipmentMaintenance_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EquipmentMaintenance"
    ADD CONSTRAINT "EquipmentMaintenance_equipmentId_fkey"
    FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
