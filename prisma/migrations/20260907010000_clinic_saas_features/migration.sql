-- AlterTable: Organization - SaaS fields (plans, suspension, onboarding)
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT UNIQUE;
ALTER TABLE "Organization" ADD COLUMN "phone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN "city" TEXT;
ALTER TABLE "Organization" ADD COLUMN "country" TEXT;
ALTER TABLE "Organization" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Organization" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "Organization" ADD COLUMN "onboardingSource" TEXT;
ALTER TABLE "Organization" ADD COLUMN "settingsJson" TEXT;
ALTER TABLE "Organization" ADD COLUMN "upgradeRequestedPlan" TEXT;
ALTER TABLE "Organization" ADD COLUMN "upgradeRequestedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "upgradeNote" TEXT;

-- AlterTable: User - doctor availability, email verification, password reset, account state
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verifyTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "verifyTokenExp" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExp" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "specialty" TEXT;
ALTER TABLE "User" ADD COLUMN "consultationFee" DECIMAL(12,2);
ALTER TABLE "User" ADD COLUMN "availabilityType" TEXT;
ALTER TABLE "User" ADD COLUMN "availableDays" TEXT;
ALTER TABLE "User" ADD COLUMN "availableFrom" TEXT;
ALTER TABLE "User" ADD COLUMN "availableTo" TEXT;
ALTER TABLE "User" ADD COLUMN "role" TEXT;

-- AlterTable: Appointment - walk-in queue tokens + cancellation reason
ALTER TABLE "Appointment" ADD COLUMN "tokenNumber" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "isWalkIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN "cancellationReason" TEXT;

-- Double-booking backstop: only one ACTIVE slot per (provider, startTime).
-- Active statuses: scheduled, confirmed, arrived, in_progress. Cancelled/no_show
-- are excluded so the same slot can be reused after cancelling.
CREATE UNIQUE INDEX "appointment_active_slot_unique"
ON "Appointment" ("providerId", "startTime")
WHERE "status" IN ('scheduled', 'confirmed', 'arrived', 'in_progress');