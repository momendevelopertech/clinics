-- Add the missing encounterId column/relation to InvoiceLineItem so the
-- database matches the declared Prisma schema (previously missed in
-- 20260907213000_billing_catalog_totals).
ALTER TABLE "InvoiceLineItem" ADD COLUMN "encounterId" TEXT;

ALTER TABLE "InvoiceLineItem"
ADD CONSTRAINT "InvoiceLineItem_encounterId_fkey"
FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
