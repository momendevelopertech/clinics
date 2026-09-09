-- SaaS Entitlements: Plan catalog, Subscription lifecycle, per-org overrides.
-- Adds no changes to existing columns; Organization.plan stays (denormalized mirror).

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "internalCode" TEXT,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "modulesJson" TEXT,
    "featuresJson" TEXT,
    "upgradeTargetId" TEXT,
    "downgradeTargetIdsJson" TEXT NOT NULL DEFAULT '[]',
    "downgradesAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE UNIQUE INDEX "Plan_internalCode_key" ON "Plan"("internalCode");
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_upgradeTargetId_fkey" FOREIGN KEY ("upgradeTargetId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "EntitlementOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleKey" TEXT,
    "featureKey" TEXT,
    "kind" TEXT NOT NULL,
    "valueJson" TEXT,
    "reason" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EntitlementOverride_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EntitlementOverride_organizationId_moduleKey_idx" ON "EntitlementOverride"("organizationId", "moduleKey");
CREATE INDEX "EntitlementOverride_organizationId_featureKey_idx" ON "EntitlementOverride"("organizationId", "featureKey");
ALTER TABLE "EntitlementOverride" ADD CONSTRAINT "EntitlementOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Backfill: seed the default plan catalog (matches legacy code limits so nothing breaks) ----
INSERT INTO "Plan" ("id", "code", "internalCode", "nameEn", "nameAr", "descriptionEn", "descriptionAr", "price", "billingCycle", "status", "displayOrder", "popular", "trialDays", "modulesJson", "featuresJson", "upgradeTargetId", "downgradeTargetIdsJson", "downgradesAllowed")
VALUES (
  'plan_free',
  'free',
  'FREE-000',
  'Starter',
  'البداية',
  'For small clinics getting started',
  'للعيادات الصغيرة التي تبدأ الآن',
  0,
  'monthly',
  'active',
  10,
  false,
  0,
  '{"dashboard":{"enabled":true},"patients":{"enabled":true},"appointments":{"enabled":true},"queue":{"enabled":true},"encounters":{"enabled":true},"analytics":{"enabled":true},"consents":{"enabled":true},"audit":{"enabled":true},"labs":{"enabled":true},"tasks":{"enabled":true},"documents":{"enabled":true},"reports":{"enabled":true},"availability":{"enabled":true},"catalogs":{"enabled":true},"communications":{"enabled":false},"locations":{"enabled":true},"waitlist":{"enabled":true},"billing":{"enabled":false},"payments":{"enabled":false},"inventory":{"enabled":true},"automation":{"enabled":false},"campaigns":{"enabled":false},"settings":{"enabled":true},"plan":{"enabled":true},"help":{"enabled":true}}',
  '{"patients":{"enabled":true,"limit":50},"staff":{"enabled":true,"limit":2},"doctors":{"enabled":true,"limit":1},"appointments_month":{"enabled":true,"limit":200},"storage_gb":{"enabled":true,"limit":1},"crm":{"enabled":false},"campaigns":{"enabled":false},"automation":{"enabled":false},"advanced_reports":{"enabled":false},"financial_reports":{"enabled":false},"basic_reports":{"enabled":true},"patient_portal":{"enabled":false},"online_booking":{"enabled":false},"sms_reminders":{"enabled":false},"email_reminders":{"enabled":false},"multi_branch":{"enabled":false},"priority_support":{"enabled":false},"audit_trail":{"enabled":true}}',
  'plan_clinic',
  '[]',
  true
), (
  'plan_clinic',
  'clinic',
  'CLN-001',
  'Clinic',
  'العيادة',
  'For growing clinics',
  'للعيادات المتنامية',
  99,
  'monthly',
  'active',
  20,
  true,
  0,
  '{"dashboard":{"enabled":true},"patients":{"enabled":true},"appointments":{"enabled":true},"queue":{"enabled":true},"encounters":{"enabled":true},"analytics":{"enabled":true},"consents":{"enabled":true},"audit":{"enabled":true},"labs":{"enabled":true},"tasks":{"enabled":true},"documents":{"enabled":true},"reports":{"enabled":true},"availability":{"enabled":true},"catalogs":{"enabled":true},"communications":{"enabled":true},"locations":{"enabled":true},"waitlist":{"enabled":true},"billing":{"enabled":true},"payments":{"enabled":true},"inventory":{"enabled":true},"automation":{"enabled":false},"campaigns":{"enabled":false},"settings":{"enabled":true},"plan":{"enabled":true},"help":{"enabled":true}}',
  '{"patients":{"enabled":true,"limit":500},"staff":{"enabled":true,"limit":10},"doctors":{"enabled":true,"limit":5},"appointments_month":{"enabled":true,"limit":5000},"storage_gb":{"enabled":true,"limit":10},"crm":{"enabled":true},"campaigns":{"enabled":false},"automation":{"enabled":false},"advanced_reports":{"enabled":false},"financial_reports":{"enabled":true},"basic_reports":{"enabled":true},"patient_portal":{"enabled":true},"online_booking":{"enabled":true},"sms_reminders":{"enabled":true},"email_reminders":{"enabled":true},"multi_branch":{"enabled":false},"priority_support":{"enabled":false},"audit_trail":{"enabled":true}}',
  'plan_plus',
  '["free"]',
  true
), (
  'plan_plus',
  'plus',
  'PLUS-002',
  'Plus',
  'بلس',
  'For busy multi-doctor clinics',
  'للعيادات النشطة متعددة الأطباء',
  249,
  'monthly',
  'active',
  30,
  false,
  0,
  '{"dashboard":{"enabled":true},"patients":{"enabled":true},"appointments":{"enabled":true},"queue":{"enabled":true},"encounters":{"enabled":true},"analytics":{"enabled":true},"consents":{"enabled":true},"audit":{"enabled":true},"labs":{"enabled":true},"tasks":{"enabled":true},"documents":{"enabled":true},"reports":{"enabled":true},"availability":{"enabled":true},"catalogs":{"enabled":true},"communications":{"enabled":true},"locations":{"enabled":true},"waitlist":{"enabled":true},"billing":{"enabled":true},"payments":{"enabled":true},"inventory":{"enabled":true},"automation":{"enabled":true},"campaigns":{"enabled":true},"settings":{"enabled":true},"plan":{"enabled":true},"help":{"enabled":true}}',
  '{"patients":{"enabled":true,"limit":null},"staff":{"enabled":true,"limit":null},"doctors":{"enabled":true,"limit":null},"appointments_month":{"enabled":true,"limit":null},"storage_gb":{"enabled":true,"limit":100},"crm":{"enabled":true},"campaigns":{"enabled":true},"automation":{"enabled":true},"advanced_reports":{"enabled":true},"financial_reports":{"enabled":true},"basic_reports":{"enabled":true},"patient_portal":{"enabled":true},"online_booking":{"enabled":true},"sms_reminders":{"enabled":true},"email_reminders":{"enabled":true},"multi_branch":{"enabled":true},"priority_support":{"enabled":true},"audit_trail":{"enabled":true}}',
  NULL,
  '["free","clinic"]',
  true
)
ON CONFLICT ("code") DO NOTHING;

-- ---- Backfill: a subscription row per existing org, derived from Organization.plan ----
INSERT INTO "Subscription" ("id", "organizationId", "planId", "status", "currentPeriodStart", "currentPeriodEnd", "billingCycle")
SELECT 'sub_' || o."id", o."id", p."id", 'active', NOW(), (NOW() + INTERVAL '1 month'), 'monthly'
FROM "Organization" o
JOIN "Plan" p ON p."code" = o."plan"
ON CONFLICT ("organizationId") DO NOTHING;