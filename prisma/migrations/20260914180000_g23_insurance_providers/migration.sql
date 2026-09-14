-- G23: additive-only migration for InsuranceProvider (drift DropIndex intentionally excluded).
CREATE TABLE "InsuranceProvider" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceProvider_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InsuranceProvider_organizationId_active_idx" ON "InsuranceProvider"("organizationId", "active");

CREATE UNIQUE INDEX "InsuranceProvider_organizationId_name_key" ON "InsuranceProvider"("organizationId", "name");

ALTER TABLE "InsuranceProvider" ADD CONSTRAINT "InsuranceProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
