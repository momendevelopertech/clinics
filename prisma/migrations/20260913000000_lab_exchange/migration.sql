-- P1#10: lab e-order exchange fields. ADDITIVE ONLY — two nullable
-- columns on LabOrder. Transmitting an order stamps transmittedAt and mints
-- an externalRef the lab quotes back; ingesting a result creates the
-- LabResult and flips the order to resulted. Vendor HL7/FHIR plumbing
-- needs lab credentials — tracked separately (F-B7).

-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN "transmittedAt" TIMESTAMP(3),
ADD COLUMN "externalRef" TEXT;
