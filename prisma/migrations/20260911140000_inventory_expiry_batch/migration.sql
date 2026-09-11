-- P0#4: expiry + batch tracking on inventory. ADDITIVE ONLY — two nullable
-- columns plus one index. Existing rows get NULLs (behavior unchanged:
-- items without an expiry simply never appear in expiry alerts).

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "batchNumber" TEXT;

-- CreateIndex
CREATE INDEX "InventoryItem_organizationId_expiryDate_idx" ON "InventoryItem"("organizationId", "expiryDate");
