ALTER TABLE "User"
ADD COLUMN "licenseNumber" TEXT,
ADD COLUMN "workingHours" TEXT,
ADD COLUMN "branchId" TEXT,
ADD COLUMN "roomId" TEXT;

ALTER TABLE "User"
ADD CONSTRAINT "User_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_organizationId_branchId_idx" ON "User"("organizationId", "branchId");
CREATE INDEX "User_organizationId_roomId_idx" ON "User"("organizationId", "roomId");
