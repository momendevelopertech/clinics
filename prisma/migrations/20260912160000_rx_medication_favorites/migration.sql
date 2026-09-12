-- Per-doctor prescription favorites for medication-name autocomplete.
CREATE TABLE "MedicationFavorite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "defaultDosage" TEXT,
    "defaultFrequency" TEXT,
    "defaultDuration" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicationFavorite_userId_medicationName_key" ON "MedicationFavorite"("userId", "medicationName");
CREATE INDEX "MedicationFavorite_organizationId_userId_idx" ON "MedicationFavorite"("organizationId", "userId");

ALTER TABLE "MedicationFavorite" ADD CONSTRAINT "MedicationFavorite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationFavorite" ADD CONSTRAINT "MedicationFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;