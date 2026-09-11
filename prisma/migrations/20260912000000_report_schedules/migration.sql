-- P1#8: scheduled monthly reports. ADDITIVE ONLY — one new (empty) table.
-- Owners register which staff receive the monthly CSV by email; the cron
-- endpoint (see /api/reports/scheduled) sends once per month per schedule
-- and stamps lastSentAt. Email delivery needs EMAIL_PROVIDER=smtp —
-- otherwise the run is recorded as skipped, never as sent.

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "recipients" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSchedule_active_frequency_idx" ON "ReportSchedule"("active", "frequency");

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
