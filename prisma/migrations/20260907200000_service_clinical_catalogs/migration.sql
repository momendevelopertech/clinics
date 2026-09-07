CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "durationMins" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClinicalCatalog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicalCatalog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalCatalog" ADD CONSTRAINT "ClinicalCatalog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ServiceCatalog_organizationId_code_key" ON "ServiceCatalog"("organizationId", "code");
CREATE UNIQUE INDEX "ClinicalCatalog_organizationId_system_code_key" ON "ClinicalCatalog"("organizationId", "system", "code");
CREATE INDEX "ServiceCatalog_organizationId_active_idx" ON "ServiceCatalog"("organizationId", "active");
CREATE INDEX "ClinicalCatalog_organizationId_category_active_idx" ON "ClinicalCatalog"("organizationId", "category", "active");
