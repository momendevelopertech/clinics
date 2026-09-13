# Codebase Feature Inventory — OpenHealthCRM
> تاريخ الفحص: 2026-09-13
> Stack: Next.js 16.1.6 (App Router) / React 19.2.3 / TypeScript 5.9.3 / Prisma 7.4.2 + PostgreSQL (Neon عبر `@prisma/adapter-pg` + `pg`) / Tailwind CSS 4 / NextAuth 4 (Credentials/JWT) / Zod 4 / Vitest 4 + Playwright
> منهجية: قراءة مباشرة للكود (routes / models / services / UI). لا تخمين. أي رقم تحت وراه ملف حقيقي.

## الفرق عن الجرد السابق

الجرد السابق (`codebase-feature-inventory.md` بتاريخ 2026-09-12) كان دقيقًا وما زال صالحًا كـ baseline. الفحص الحالي أكّد كل أعداده الأساسية ورصد الفروق التالية (كلها من الكوميت `e6bcaa4` + توثيق لاحق، ولا يوجد أي تغيير في السكيما):

### فيتشرز/routes/موديلز جديدة (لم تكن في الجرد القديم)
| البند | الدليل |
|---|---|
| صفحة `/insurance` (سياسات + أهلية + دورة مطالبات، 575 سطر) | `src/app/(dashboard)/insurance/page.tsx` |
| صفحة `/equipment` (سجل معدات + تنبيهات معايرة + سجل صيانة، 465 سطر) | `src/app/(dashboard)/equipment/page.tsx` |
| صفحة `/integrations` (مفاتيح API + webhooks + حالة FHIR، 376 سطر) | `src/app/(dashboard)/integrations/page.tsx` |
| `GET /api/config/status` (booleans + أسماء متغيرات ناقصة فقط، بلا قيم سرية، 401 بدون جلسة) | `src/app/api/config/status/route.ts` |
| `FeatureNotConfiguredBanner` + `useFeatureConfig` + `getFeatureConfigStatus/getAllFeatureConfigStatuses` (6 فيتشرز: ai/fhir/twilio/cloudinary/stripe/email) | `src/components/ui/feature-not-configured-banner.tsx`، `src/hooks/use-feature-config.ts`، `src/lib/feature-config.ts` |
| 3 عناصر nav جديدة (`nav_insurance` لبiller، `nav_equipment` لممرض/صيدلي، `nav_integrations` لOwner) + شارات not-configured في السايدبار | `src/components/ui/dashboard-with-collapsible-sidebar.tsx:95-97,220,223,245` |
| ~100 مفتاح i18n جديد (`ins_*` 31، `eq_*` 22، `int_*` 20، `cfg_*` 23، + 3 مفاتيح `nav_*`) | `src/lib/i18n/dictionaries/en.ts`، `src/lib/i18n/dictionaries/ar.ts` |
| ملفا تست جديدان: `feature-config.test.ts` (9 تستات) + `new-pages.test.ts` (3 تستات) | `tests/unit/feature-config.test.ts`، `tests/unit/new-pages.test.ts` |
| متغيرات `AI_*` و`TWILIO_*` في `.env.example` | `.env.example` |

### حاجات كانت "ناقصة/محتاجة تأكيد" وبقت مكتملة
| البند في القديم | الوضع الآن |
|---|---|
| "سياسات/مطالبات التأمين API بلا صفحة dashboard" | صفحة `/insurance` موجودة ومربوطة فعليًا بـ `GET/POST /api/insurance/policies` و`GET /api/insurance/policies/[id]/eligibility` و`POST /api/insurance/claims` و`PATCH /api/insurance/claims/[id]` (`src/app/(dashboard)/insurance/page.tsx`) |
| "المعدات والصيانة schema/API بلا nav" | صفحة `/equipment` + عنصر nav (`inventory` moduleKey) مربوطة بـ `GET/POST /api/equipment` و`GET/POST /api/equipment/[id]/maintenance` |
| "`WebhookDelivery` بلا صفحة UI" | صفحة `/integrations` فيها جدول webhooks (pause/resume/delete) + مفاتيح API، مربوطة بـ `GET/POST /api/webhooks` و`PATCH/DELETE /api/webhooks/[id]` و`GET/POST /api/api-keys` و`POST /api/api-keys/[id]/revoke` |
| "`.env.example` لا يذكر متغيرات Twilio" | المتغيرات الأربعة موجودة الآن وموثقة مربوطة بـ `src/lib/communications.ts:55-67` |
| "F-FLAG1 مراجعة سريرية OPEN" | اتراجعت قراءةً فقط في 2026-09-13: الوضع المُبلغ عنه لم يعد موجودًا في الـ DB (روشتة واحدة + قراءة ضغط واحدة + تشخيص I10 متسق) — بانتظار توقيع دكتور للإغلاق (`PROGRESS.md`) |

### حاجات كانت مكتملة وبقت فيها مشكلة (جديدة، واحدة فقط)
| البند | الدليل |
|---|---|
| مفتاح `int_paused` مستخدم في UI لكنه **غائب من القاموسين** (en وar) فيقع على اسم المفتاح الخام | `src/app/(dashboard)/integrations/page.tsx:353` مقابل صفر نتائج في `src/lib/i18n/dictionaries/en.ts` و`ar.ts` (تم التحقق بـ grep مباشر) |

### حاجات اتشالت أو مبقاش لها استخدام
- لا شيء اتشال منذ الجرد السابق. الملفات القديمة الميتة ما زالت كما هي (`src/app/actions/patients.ts` غير مستورد في أي مكان — تحقق grep).

### أعداد ثابتة (تم التحقق، بلا تغيير)
- السكيما: 69 موديل / 46 مايجريشن — نفس الجرد السابق (لا diff في `prisma/schema.prisma` يضيف/يحذف موديل؛ العدد الحالي 69 `^model ` مؤكد).
- ملاحظة شاذة ما زالت قائمة من القديم: مايجريشن `20260913000000_lab_exchange` و`20260914000000_equipment_maintenance` مؤرخة بعد تاريخ الجرد السابق — محتاج تأكيد يدوي لحالة تطبيقها على Neon.

## الموديلز الموجودة في السكيما (خريطة كاملة)

المصدر: `prisma/schema.prisma` (69 موديل، 46 مايجريشن في `prisma/migrations/`). `organizationId` + `organization` هو حد الـ tenant المعتاد حيثما وُجد.

| الموديل | الحقول المعلنة | علاقات / دورة حياة |
|---|---|---|
| Organization | `id, name, slug, phone, address, city, country, status, plan, onboardingSource, settingsJson, upgradeRequestedPlan, upgradeRequestedAt, upgradeNote, timezone, currency, createdAt, updatedAt` + علاقات بكل الكيانات | الجذر. `status`: pending/active/suspended؛ `plan`: free/clinic/plus |
| Plan | `id, code, internalCode, nameEn, nameAr, descriptionEn, descriptionAr, price, billingCycle, status, displayOrder, popular, trialDays, modulesJson, featuresJson, upgradeTargetId, downgradeTargetIdsJson, downgradesAllowed, createdAt, updatedAt` | `status`: active/archived؛ علاقة ترقية ذاتية |
| Subscription | `id, organizationId, planId, status, currentPeriodStart, currentPeriodEnd, trialEndsAt, cancelAtPeriodEnd, canceledAt, billingCycle, notes, createdAt, updatedAt` | `status`: trialing/active/past_due/canceled/expired؛ واحدة لكل مؤسسة |
| EntitlementOverride | `id, organizationId, moduleKey, featureKey, kind, valueJson, reason, createdById, expiresAt, createdAt, updatedAt` | تجاوز module/feature/limit بانتهاء data-driven |
| WaitlistEntry | `id, organizationId, patientId, preferredDate, notes, status, createdAt, updatedAt` | `status`: waiting/offered/cancelled |
| User | `id, organizationId, email, name, passwordHash, avatarUrl, avatarPublicId, active, emailVerified, verifyTokenHash, verifyTokenExp, resetTokenHash, resetTokenExp, specialty, licenseNumber, workingHours, branchId, roomId, consultationFee, availabilityType, availableDays, availableFrom, availableTo, role, totpSecret, totpEnabled, totpBackupCodes, totpEnabledAt, createdAt, updatedAt` | هوية طاقم + RBAC + توفر + 2FA |
| Role | `id, organizationId, name, createdAt, updatedAt` | دور لكل tenant |
| RolePermission | `id, roleId, action, resource, createdAt` | ورقة صلاحية؛ تُدار عبر staff routes (مقطع nested فقط في `src/app/api/signup/route.ts:112,128`) |
| UserRole | `id, userId, roleId, createdAt` | إسناد user/role فريد |
| Patient | `id, organizationId, mrn, firstName, lastName, dateOfBirth, gender, email, phone, phoneSecondary, marketingOptOut, address, city, state, zip, country, bloodType, allergies, primaryCareProvider, passwordHash, sensitiveDataEncrypted, familyHistory, status, createdAt, updatedAt` | `status`: Active/Inactive/Archived؛ `mrn` فريد لكل مؤسسة (`@@unique([organizationId, mrn])`) |
| PatientAllergy | `id, organizationId, patientId, allergen, severity, reaction, onset, active, createdAt, updatedAt` | CRUD كامل عبر `src/app/api/patients/[id]/allergies/**` |
| PatientSession | `id, patientId, tokenHash, expiresAt, revokedAt, ipAddress, userAgent, createdAt, updatedAt` | جلسات البورتال؛ تُستخدم في `src/lib/patient-auth.ts` فقط (لا route مباشر) |
| PatientHistory | `id, organizationId, patientId, category, title, details, onsetDate, resolvedAt, status, createdAt, updatedAt` | تاريخ مرضي عبر `src/app/api/patients/[id]/history/route.ts` |
| EmergencyContact | `id, patientId, name, relationship, phone, email, contactDataEncrypted` | nested فقط (`src/app/api/patients/[id]/route.ts:77,121,213`)؛ لا route مستقل |
| Consent | `id, patientId, organizationId, consentType, isGranted, documentUrl, signedAt, createdAt, updatedAt` | `organizationId` إجباري؛ staff + portal routes |
| Branch | `id, organizationId, name, address, city, state, zip, country, phone, email, status, workingHours, createdAt, updatedAt` | `status`: active/inactive |
| Shift | `id, organizationId, userId, branchId, weekday, startTime, endTime, note, createdAt, updatedAt` | نوبات أسبوعية (`src/app/api/shifts/**`) |
| Appointment | `id, organizationId, branchId, patientId, providerId, roomId, startTime, endTime, bufferMinutes, appointmentType, telehealthUrl, status, notes, tokenNumber, isWalkIn, cancellationReason, checkedInAt, checkedOutAt, idempotencyKey, isRecurring, recurrenceRule, reminder24hSent, reminder1hSent, createdAt, updatedAt` | `status`: scheduled/arrived/in_progress/completed/cancelled/no_show؛ index فريد جزئي على (providerId, startTime) للحالات النشطة |
| AppointmentEquipment | `id, appointmentId, equipmentId, allocatedAt` | join فقط؛ **صفر استخدام في `src/`** (ميت) |
| Room | `id, organizationId, branchId, name, number, type, status, workingHours, createdAt, updatedAt` | `status`: active/inactive |
| Equipment | `id, organizationId, name, type, lastCalibrationAt, nextCalibrationAt, status, createdAt, updatedAt` | `status`: active/warning/maintenance_required/inactive؛ صفحة `/equipment` جديدة |
| EquipmentMaintenance | `id, organizationId, equipmentId, type, status, description, technician, performedAt, dueAt, cost, notes, createdAt, updatedAt` | `type`: preventive/corrective/calibration؛ `status`: scheduled/completed/overdue |
| Encounter | `id, organizationId, patientId, appointmentId, startTime, endTime, status, encounterType, createdAt, updatedAt` | `status`: in_progress/completed؛ جذر الـ workspace السريري |
| EncounterNote | `id, encounterId, authorId, noteType, subjective, objective, assessment, plan, text, templateId, createdAt, updatedAt` | SOAP/freeform عبر `src/app/api/encounters/[id]/notes/route.ts` |
| Vital | `id, patientId, encounterId, weightKg, heightCm, bloodPressureSystolic, bloodPressureDiastolic, heartRate, bmi, spO2, temperature, recordedAt` | تسجيل + trend + SSE stream |
| Prescription | `id, organizationId, patientId, encounterId, prescribedById, medicationName, dosage, frequency, duration, instructions, status, idempotencyKey, sentToPharmacy, createdAt, updatedAt` | `status`: active/completed/cancelled؛ PATCH/DELETE + send + favorites + templates |
| PrescriptionItem | `id, prescriptionId, medicationName, dosage, frequency, duration, instructions, createdAt` | سطور nested (تُنشأ في transaction روشتة واحدة)؛ لا route مستقل |
| Diagnosis | `id, organizationId, patientId, encounterId, system, code, name, notes, status, createdAt, updatedAt` | عبر clinical-orders/encounters؛ لا CRUD مستقل |
| FollowUp | `id, organizationId, patientId, encounterId, dueDate, reason, instructions, status, createdAt, updatedAt` | `status` يبدأ planned؛ تصعيد تلقائي عبر cron |
| LabResult | `id, organizationId, patientId, orderId, testName, resultValue, unit, referenceRange, status, performedAt, reportUrl, reviewedById, reviewedAt, reviewNote, createdAt, updatedAt` | `status`: pending/completed/abnormal/reviewed |
| LabOrder | `id, organizationId, patientId, encounterId, orderedById, orderType, testName, priority, indication, transmittedAt, externalRef, status, orderedAt, results, createdAt, updatedAt` | `status`: ordered/collected/resulted/reviewed/cancelled؛ `priority`: routine/urgent/stat |
| Invoice | `id, organizationId, patientId, invoiceNumber, currency, status, totalAmount, amountPaid, dueDate, idempotencyKey, couponCode, orderDiscount, createdAt, updatedAt` | `status`: draft/sent/partially_paid/paid/overdue |
| InvoiceLineItem | `id, invoiceId, serviceCatalogId, description, quantity, unitPrice, discountAmount, taxAmount, amount, cptCode, createdAt, encounterId` | تفاصيل فوترة مربوطة اختياريًا بزيارة/خدمة |
| Coupon | `id, organizationId, code, kind, value, active, expiresAt, createdAt, updatedAt` | `kind`: percent/fixed |
| InstallmentPlan | `id, organizationId, invoiceId, patientId, totalAmount, downPayment, status, notes, createdAt, updatedAt` | `status`: active/completed/cancelled |
| Installment | `id, planId, dueDate, amount, status, paidAt, paymentId, createdAt, updatedAt` | `status`: pending/paid/overdue/cancelled؛ تُستخدم في `src/app/api/installment-plans/**` |
| Expense | `id, organizationId, branchId, category, amount, spentAt, notes, createdAt, updatedAt` | GET/POST + DELETE |
| ClinicalTemplate | `id, organizationId, name, specialty, noteType, subjective, objective, assessment, plan, isDefault, createdAt, updatedAt` | قوالب SOAP |
| ServicePackage | `id, organizationId, name, serviceCatalogId, procedureName, totalSessions, price, active, createdAt, updatedAt` | كتالوج باقات مدفوعة مقدمًا |
| PatientPackage | `id, organizationId, patientId, packageId, sessionsTotal, sessionsUsed, status, pricePaid, createdAt, updatedAt` | `status`: active/completed/cancelled؛ استهلاك ذري |
| TreatmentPlan | `id, organizationId, patientId, encounterId, title, notes, status, createdAt, updatedAt` | `status`: draft/active/completed/cancelled |
| TreatmentPlanStep | `id, planId, kind, refId, title, dueDate, status, createdAt, updatedAt` | `kind`: diagnosis/prescription/procedure/followup/note؛ `status`: pending/done/skipped |
| Feedback | `id, organizationId, patientId, appointmentId, providerId, rating, comment, source, createdAt` | `source`: portal/staff/auto؛ تقييم 1-5 |
| IntakeForm | `id, organizationId, name, description, active, createdAt, updatedAt` | فورم/حقول CRUD + ردود |
| IntakeField | `id, formId, key, label, labelAr, kind, required, options, position, createdAt` | `kind`: text/multiline/number/date/boolean/choice |
| IntakeResponse | `id, organizationId, formId, patientId, appointmentId, answers, createdAt` | إجابات JSON |
| ReportSchedule | `id, organizationId, frequency, dayOfMonth, recipients, active, lastSentAt, createdAt, updatedAt` | جدولة تقارير شهرية بالبريد |
| Payment | `id, invoiceId, amount, paymentMethod, stripePaymentId, status, refundedAmount, refundKey, updatedAt, createdAt` | `status`: pending/completed/failed/refunded؛ استرداد idempotent |
| InsurancePolicy | `id, patientId, provider, policyNumber, groupNumber, type, createdAt, updatedAt` | `type`: primary/secondary؛ صفحة `/insurance` جديدة |
| InsuranceClaim | `id, organizationId, patientId, invoiceId, claimNumber, status, amountClaimed, amountPaid, denialReason, submittedAt, paidAt, createdAt, updatedAt` | `status`: submitted/pending/paid/denied/appeal؛ آلة انتقالات محكومة `canTransitionClaim` |
| PricingTier | `id, organizationId, name, description, createdAt` | **صفر استخدام في `src/`** (ميت — seed/catalog فقط) |
| ServiceCatalog | `id, organizationId, code, name, description, category, durationMins, price, active, createdAt, updatedAt` | عبر `GET/POST /api/catalogs` |
| ClinicalCatalog | `id, organizationId, system, code, name, category, description, active, createdAt, updatedAt` | عبر `GET/POST /api/catalogs` |
| InventoryItem | `id, organizationId, name, sku, category, quantity, reorderLevel, unit, expiryDate, batchNumber, createdAt, updatedAt` | تنبيهات expiry/batch عبر `GET/POST /api/inventory/alerts` |
| InventoryTransaction | `id, itemId, type, quantity, reason, createdAt` | `type`: restock/usage/adjustment؛ nested في `src/app/api/inventory/[id]/transaction/route.ts:48` |
| Communication | `id, organizationId, patientId, channel, type, status, content, scheduledFor, sentAt, createdAt, updatedAt` | `channel`: sms/email/whatsapp؛ `status`: pending/sent/delivered/failed |
| Campaign | `id, organizationId, name, type, status, triggerType, createdAt, updatedAt` | `type`: drip/broadcast؛ إطلاق عبر `POST .../campaigns/[id]/launch` |
| FeedbackSurvey | `id, patientId, encounterId, npsScore, feedback, sentAt, respondedAt, createdAt` | **ميت كموديل**: مجرد string في `src/lib/patient-merge.ts:24`؛ الفيتشر الفعلي هو `Feedback` |
| Task | `id, organizationId, title, description, status, priority, dueDate, patientId, assigneeId, creatorId, taskType, createdAt, updatedAt` | `status`: open/in_progress/completed/cancelled؛ `priority`: low/medium/high/urgent |
| Document | `id, organizationId, patientId, procedureOrderId, name, type, storageKey, publicId, mimeType, createdAt` | `type`: imaging/lab_report/consent/id؛ وصول موقّع HMAC |
| ProcedureOrder | `id, organizationId, patientId, encounterId, orderedById, serviceCatalogId, procedureName, status, scheduledAt, notes, completedAt, createdAt, updatedAt` | إجراءات بآلة حالة + ربط مستندات |
| AuditLog | `id, organizationId, userId, actorType, actorIdentifier, action, entityType, entityId, beforeState, afterState, ipAddress, userAgent, createdAt` | append-only؛ actor: user/patient/system/webhook |
| Notification | `id, organizationId, recipientId, channel, title, body, entityType, entityId, status, deliveredAt, readAt, failureReason, createdAt` | قراءة/تحديث + push |
| PushSubscription | `id, userId, organizationId, endpoint, p256dh, auth, userAgent, createdAt, updatedAt` | اشتراكات push المتصفح |
| ApiKey | `id, organizationId, name, prefix, keyHash, scopes, active, lastUsedAt, createdAt, updatedAt` | CRUD + revoke؛ scopes مثل `fhir:write`؛ تُدار من `/integrations` |
| Webhook | `id, organizationId, url, secretHash, eventTypes, active, createdAt, updatedAt` | CRUD؛ توقيع HMAC + 3 retries + سجل توصيل |
| WebhookDelivery | `id, webhookId, eventType, attempt, status, payload, responseStatus, responseBody, error, deliveredAt, createdAt` | تُدار عبر `src/lib/webhook-delivery.ts:66,87` فقط؛ لا route مباشر |
| MedicationFavorite | `id, organizationId, userId, medicationName, defaultDosage, defaultFrequency, defaultDuration, usageCount, lastUsedAt, createdAt` | `GET /api/prescriptions/favorites` + upsert عند إنشاء روشتة |
| PrescriptionTemplate | `id, organizationId, createdById, name, specialty, isShared, items, usageCount, createdAt, updatedAt` | CRUD + عدّاد استخدام fire-and-forget |

## الدومينات/الفيتشرز المكتشفة

النمط المعياري لأي handler: `getOrgId()` + `assertOrgScope()` ثم `requireModulePermission` أو `requireAnyPermission` (الـ 403 عبر `authz.response`)، ثم استعلام مقيّد بـ `organizationId`، ثم Zod ثم `createAuditLog` للكتابة. الاستثناءات مذكورة تحت كل دومين.

### 1. المصادقة والـ tenant والـ RBAC والخطط
- **Routes:** `/api/auth/[...nextauth]` (GET/POST مفوَّضة لـ NextAuth)، `forgot-password`/`reset-password`/`verify-email`/`resend-verification` (POST)، `2fa/setup|verify|disable` (POST) + `2fa/status` (GET)، `/api/signup` (POST ينشئ مؤسسة/مالك)، `/api/plan/entitlements` (GET)، `/api/org/request-upgrade` (POST)، `/api/super/*` (14 route: plans/orgs/approvals/audit/settings).
- **فعليًا:** TOTP عبر otplib (secret مشفر + backup codes لمرة واحدة + بوابة دخول بخطوتين) — `src/app/api/auth/2fa/*`. إيقاف الإنتاج بدون `ENCRYPTION_KEY`/`NEXTAUTH_SECRET` صالحين — `src/lib/boot-env.ts:41-48`. عزل tenant عبر `organizationId` في كل استعلام + تست `tests/integration/tenant-isolation.test.ts` (3/3 أخضر على DB حية).
- **Lifecycle:** `Organization.status` (pending/active/suspended) — الجلسات القديمة تُرفض بعد التعليق (`src/lib/patient-auth.ts`).
- **ربط الطبقات:** `src/components/super/super-console.tsx` ← `/api/super/*`؛ `src/components/plan/plan-dashboard.tsx` ← `/api/plan/entitlements`؛ السايدبار يقفل الروابط حسب `planModules[moduleKey]` ويحوّل لـ `/plan?lock=` (`src/components/ui/dashboard-with-collapsible-sidebar.tsx`).
- **ناقص:** `RolePermission` بلا صفحة إدارة (تُدار عبر staff)؛ routes خطط السوبر بلا audit صريح في المسح (محتاج مراجعة يدوية للسياسة).
- **خارجي:** لا شيء — داخلي بالكامل.

### 2. المرضى والبورتال والموافقات
- **Routes:** `/api/patients` (GET بحث سيرفر `?q=&status=&page=&pageSize=` + POST)، `[id]` (GET/PATCH)، `[id]/archive|merge|summary|attendance|history|allergies`، `/api/consents` + `[id]`، `/api/insurance/policies|claims`، `/api/patient-auth/login|logout|me`، `/api/patient-portal/*` (11 route: overview/documents/invoices/payments/consents/feedback/intake/appointments-cancel-reschedule).
- **فعليًا:** دمج ملفات (19 جدول + تعارض EmergencyContact + revoke جلسات + أرشفة + audit) عبر `POST .../merge`؛ حساسية منظمة (`PatientAllergy`) مع تحذير تعارض في الروشتة (`src/lib/allergies.ts`)؛ ملخص قابل للطباعة + QR عبر `GET .../summary`.
- **ربط الطبقات:** `src/app/(dashboard)/patients/page.tsx` + `add-patient-dialog.tsx` + `merge-patients-dialog.tsx` + `patient-allergies-card.tsx` ← routes أعلاه؛ `src/app/patient-portal/page.tsx` ← `/api/patient-portal/*` (5 تبويبات معطلة بـ `portal_comingSoon` — `src/app/patient-portal/page.tsx:327,336,344,352,384`).
- **ناقص:** `EmergencyContact` بلا route مستقل؛ تبويبات بورتال معلنة "قريبًا".
- **خارجي:** لا شيء.

### 3. المواعيد والحجز والطابور والفروع
- **Routes:** `/api/appointments` (GET/POST/PATCH)، `[id]/check-in|check-out|no-show` (POST+OPTIONS)، `[id]/recurrence|telehealth`، `/api/book/[orgSlug]/availability|appointments` (عمومي)، `/api/queue` + `/api/queue/actions`، `/api/branches|rooms|shifts`، `/api/profile/availability`، `/api/waitlist` + `[id]/book`.
- **فعليًا:** منع تعارض مزدوج (فحص transaction + index فريد جزئي على DB)؛ check-in/out/no-show عبر `src/lib/reception.ts`؛ حجز عمومي بـ idempotency + حد 30/min لكل IP؛ عرض تلقائي لslot ملغى لأعلى 3 في الانتظار.
- **Lifecycle:** scheduled → arrived → in_progress → completed (أو cancelled/no_show)؛ waitlist: waiting/offered/cancelled.
- **ربط الطبقات:** `appointments-calendar.tsx` + `book-appointment-dialog.tsx` + `reception-board.tsx` ← routes أعلاه؛ صفحة `/book/[orgSlug]` العمومية ← booking APIs.
- **ناقص:** `AppointmentEquipment` ميت (صفر استخدام) — لا تخصيص معدات للمواعيد رغم وجود جدول الربط.
- **خارجي:** Google Calendar غير موجود (BLOCKED — انظر Pending).

### 4. الزيارات السريرية والعلامات والملاحظات وخطط العلاج
- **Routes:** `/api/encounters` (GET/POST) + `[id]` (PATCH) + `[id]/notes` (POST)، `/api/vitals` + `/vitals/trend|stream`، `/api/clinical-templates` + `[id]`، `/api/treatment-plans` + `[id]` + `[id]/steps`، `/api/clinical-orders`، `/api/procedure-orders` + `[id]`، `/api/ai/scribe|summary` (POST).
- **فعليًا:** ملاحظات SOAP منظمة + قوالب per-specialty (`ClinicalTemplate`) + منحنى vitals (SVG sparkline + min/max/avg) + ملخص زيارة حتمي + سرد AI اختياري + خطط علاج بخطوات وحالات + أوامر إجرائية بآلة حالة.
- **Lifecycle:** encounter: in_progress → completed؛ treatment plan: draft/active/completed/cancelled؛ steps: pending/done/skipped.
- **ربط الطبقات:** `src/components/encounters/encounters-workspace.tsx` + `ai-assist-card.tsx` (يملأ SOAP تلقائيًا) + `src/components/treatment/treatment-plans-section.tsx` + بطاقة vitals في صفحة المريض ← routes أعلاه.
- **ناقص:** `Diagnosis` و`FollowUp` بلا CRUD مستقل (يُنشآن عبر clinical-orders والأتمتة).
- **خارجي:** AI فقط (fails closed — انظر قسم 12).

### 5. الروشتات (وصفات + مفضلات + قوالب)
- **Routes:** `/api/prescriptions` (GET/POST) + `[id]` (PATCH/DELETE، بلا GET) + `[id]/send` (POST) + `/api/prescriptions/favorites` (GET) + `/api/prescription-templates` + `[id]` + `[id]/use`.
- **فعليًا:** POST يتحقق (Zod + مريض/زيارة + idempotency) ويُرجع تحذيرات حساسية استشارية غير حاجبة (`findMedicationAllergyWarnings` في `src/lib/allergies.ts`) ويسجّل audit ويحدّث `MedicationFavorite`؛ PATCH يغيّر الحالة + `sentToPharmacy` فقط؛ DELETE للحالة `cancelled` فقط (وإلا 409)؛ إرسال SMS/WhatsApp عبر `renderPrescriptionMessage`؛ تكرار آخر روشتة + استنساخ + مفضلات + قوالب مشتركة/خاصة.
- **Lifecycle:** active → completed/cancelled (+ `sentToPharmacy` مستقل).
- **ربط الطبقات:** `src/app/(dashboard)/prescriptions/page.tsx` + `new-prescription-dialog.tsx` + `repeat-last-rx-button.tsx` + `clone-rx-button.tsx` + `send-rx-button.tsx` + صفحة الطباعة `print/prescription/[id]` + صفوف timeline المريض ← routes أعلاه.
- **ناقص:** لا تكامل شبكة صيدليات خارجية (E-prescribe region-specific غير موجود — قرار سوبر أدمن).
- **خارجي:** SMS/WhatsApp للإرسال فقط (عبر Twilio عند التهيئة).

### 6. التحاليل والأشعة وFHIR والإجراءات والمستندات
- **Routes:** `/api/lab-orders` + `[id]` + `[id]/transmit|ingest|[verb]` + `/api/labs` + `/api/procedure-orders` + `[id]` + `/api/documents` + `generate|templates|[id]/download|[id]/token` + `/api/uploads` + `/api/integrations/fhir/[...path]` + `/api/api-keys` + `[id]/revoke` + `/api/webhooks` + `[id]`.
- **فعليًا:** طلبات معمل/أشعة (`orderType`) + `transmit` يبني FHIR DiagnosticRequest ويختم `externalRef` + `ingest` يكتب `LabResult` ويقلب الطلب `resulted` (`src/lib/lab-exchange.ts`)؛ رفع Cloudinary وحيد عبر `/api/uploads` مع allowlist؛ مستندات PDF سيرفرية بـ `@react-pdf/renderer` (6-7 قوالب)؛ وصول موقّع HMAC منتهي (`src/lib/signed-urls.ts`)؛ FHIR قراءة مقيدة + كتابة Patient/Observation بمفتاح `fhir:write`.
- **Lifecycle:** lab order: ordered/collected/resulted/reviewed/cancelled؛ procedure: ordered/in_progress/completed/cancelled.
- **ربط الطبقات:** `src/app/(dashboard)/labs/page.tsx` + `LabOrdersSection` + `upload-document-dialog.tsx` + صفحة `/integrations` (مفاتيح/webhooks) ← routes أعلاه.
- **ناقص:** لا vendor معمل/أشعة مسمّى (عام فقط)؛ لا نموذج طلب أشعة مستقل؛ `PricingTier` ميت.
- **خارجي:** Cloudinary (حقيقي) + FHIR upstream عام (عند `FHIR_BASE_URL`).

### 7. الفوترة والمدفوعات والتأمين والباقات والمصروفات
- **Routes:** `/api/billing/invoices` (GET/POST) + `/api/payments` + `[id]/refund` + `/api/installment-plans` + `[id]` + `[id]/pay` + `/api/coupons` + `[id]` + `/api/insurance/*` (4) + `/api/packages` + `/api/patient-packages` + `[id]` + `[id]/consume` + `/api/expenses` + `[id]` + `/api/patient-portal/invoices|payments` + `/api/webhooks/stripe`.
- **فعليًا:** فواتير ببنود كتالوج + كوبونات (percent/fixed) + تقسيط بدفع ذري + استرداد idempotent (Stripe للبطاقات + عكس محلي للنقدي، جزئي مدعوم) + باقات جلسات برصيد واستهلاك + مصروفات تدخل في صافي الربح + webhook سترايب بتوقيع verified ومنع تكرار (`shouldApplyPaymentEvent` في `src/lib/webhooks.ts`).
- **Lifecycle:** invoice: draft/sent/partially_paid/paid/overdue؛ claim: submitted→pending→paid/denied→appeal؛ package: active/completed/cancelled.
- **ربط الطبقات:** `src/app/(dashboard)/billing/page.tsx` (فواتير + مصروفات + بانر stripe) + `payments/page.tsx` (طرق دفع + استرداد بخطوتين) + `insurance/page.tsx` (جديدة) + `new-invoice-dialog.tsx` + `payment-dialog.tsx` + `installment-plans-dialog.tsx` + `packages-section.tsx` ← routes أعلاه.
- **ناقص:** لا بوابة محلية (F-B4)؛ لا clearinghouse تأمين حقيقي (محلي فقط)؛ سياسة P4-T3 معلقة بقرار.
- **خارجي:** Stripe (حقيقي، يتدهور بأمان).

### 8. التواصل والحملات والتنبيهات والدفع التلقائي
- **Routes:** `/api/communications` + `scheduled|appointment-reminders|campaigns` + `campaigns/[id]/launch` + `/api/notifications` + `[id]` + `/push` + `/api/cron/follow-up-escalation` + `/api/feedback` + `/feedback/request`.
- **فعليًا:** إرسال فوري/مجدول (SMS/WhatsApp/Email) + تذكيرات تُحترم cadences وquiet hours مع سجلات per-channel + حملات WhatsApp بقوالب معتمدة وإطلاق draft→active + تصعيد follow-ups (CAS + Task + رسالة) + طلب تقييم post-visit + push متصفح (VAPID).
- **Lifecycle:** communication: pending/sent/delivered/failed؛ campaign: draft/active.
- **ربط الطبقات:** `communications/page.tsx` (بانر twilio) + `campaigns/page.tsx` (زر Launch) + `report-schedule-card.tsx` (بانر email) + بطاقة portal ← routes أعلاه.
- **ناقص:** لا أتمتة drip/post-visit كاملة؛ لا مزود فيديو مُدار (F-B5).
- **خارجي:** Twilio + Nodemailer/Resend (حقيقيان عند التهيئة).

### 9. المخزون والمعدات
- **Routes:** `/api/inventory` + `[id]` + `[id]/transaction` + `/api/inventory/alerts` (GET/POST) + `/api/equipment` + `[id]/maintenance`.
- **فعليًا:** أصناف (expiry/batch) + حركات restock/usage/adjustment بلا سالب + تنبيهات سيرفر (نقص/انتهاء) + digest يومي عبر cron + معدات بحالة معايرة (`getEquipmentCalibrationAlertStatus`) + سجل صيانة.
- **ربط الطبقات:** `inventory/page.tsx` (بانرات سيرفر) + `add-item-dialog.tsx` + `equipment/page.tsx` (جديدة: شارات CalOk/Warning/Overdue + drill-down سجل) ← routes أعلاه.
- **ناقص:** لا ربط transaction بدفعة محددة؛ لا تخصيص معدات للمواعيد (`AppointmentEquipment` ميت).
- **خارجي:** لا شيء.

### 10. المهام والتقارير والتحليلات والأتمتة
- **Routes:** `/api/tasks` + `[id]` + `/api/reports/monthly|scheduled|schedules` + `schedules/[id]` + `/api/analytics/dashboard` + `/api/automation/signals`.
- **فعليًا:** مهام (أولوية/نوع/inc. تصعيد تلقائي) + تقرير شهري (ملخص + perDay + perDoctor + perService) + تصدير CSV/XLSX + جدولة بريدية شهرية (stamp مرة/شهر، تخطي رشيق) + KPIs (نشطين/مواعيد/إيراد/مستحق/جدد×عائدين/no-show) + إشارات read-only (overdue/unreviewed/no-show حتى 50).
- **ربط الطبقات:** `tasks/page.tsx` + `create-task-dialog.tsx` + `reports-dashboard.tsx` + `report-schedule-card.tsx` (بانر email) + `dashboard/page.tsx` (يتفرع DoctorBoard/ReceptionBoard حسب الدور) ← routes أعلاه.
- **ناقص:** لا report builder تفاعلي؛ لا منحنيات نمو/cohort؛ الإشارات read-only بلا إرسال فوري.
- **خارجي:** SMTP/Resend للجدولة البريدية فقط.

### 11. الإعدادات والأمان والتدقيق والتشغيل
- **Routes:** `/api/settings` + `/api/profile/avatar|availability` + `/api/staff` + `/api/staff/roles` + `/api/shifts` + `[id]` + `/api/org/export` + `/api/audit` + `/api/health|ready`.
- **فعليًا:** إعدادات مؤسسة (تذكيرات/severity/ intake forms) + أفاتار/لوجو Cloudinary مع تنظيف replace + دليل طاقم + rota بمنع تداخل + تصدير JSON للمالك (16 جدول + checksum + audit) + تدقيق قابل للفلترة + فحص صحة/جاهزية.
- **ربط الطبقات:** `settings/page.tsx` (منها intake-forms-manager) + `staff/page.tsx` + `security/page.tsx` + `audit/page.tsx` + `locations/page.tsx` + `availability/page.tsx` ← routes أعلاه.
- **ناقص:** سكوب فرع per-route كامل مؤجل؛ النسخ الاحتياطي مسؤولية Postgres المستضاف (لا زر داخل التطبيق).
- **خارجي:** Cloudinary للأفاتار/اللوجو.

### 12. التكاملات والمفاتيح والذكاء الاصطناعي والبوابات
- **Routes:** `/api/integrations/fhir/[...path]` + `/api/api-keys` + `[id]/revoke` + `/api/webhooks` + `[id]` + `/api/ai/scribe|summary` + `/api/config/status` (+ بوابة `src/proxy.ts`: جلسات NextAuth + rate-limit + مطابقة أدوار + مسارات عمومية).
- **فعليًا:** FHIR قراءة مقيدة + كتابة Patient/Observation (جلسة أو `Bearer crm_live_…` + `x-org-slug` + scope) مع webhooks+audit؛ مفاتيح (prefix + SHA-256 + `lastUsedAt` + revoke)؛ webhooks (سر لمرة واحدة + HMAC + توصيل)؛ AI (scribe→SOAP + ملخص منظم، fails closed)؛ بوابة config read-only للشارات.
- **ربط الطبقات:** `integrations/page.tsx` (Owner) + `ai-assist-card.tsx` + `feature-not-configured-banner.tsx` + شارات السايدبار ← routes أعلاه.
- **ناقص:** لا توثيق REST عام؛ FHIR عام بلا vendor مسمّى.
- **خارجي:** OpenAI/Anthropic + FHIR upstream + Stripe-webhook (انظر Pending للتفعيل).

## nav items بدون صفحة فعلية / صفحات بدون nav item

| البند | النتيجة | الدليل |
|---|---|---|
| كل روابط السايدبار (33 عنوانًا + 6 سوبر) | لها صفحة — لا mismatch | `src/components/ui/dashboard-with-collapsible-sidebar.tsx` مقابل `src/app/**/page.tsx` (50 ملفًا) |
| `/super?section=*` | تُعالج داخل كونسول واحد | `src/app/super/page.tsx` + `src/components/super/super-console.tsx` |
| `patients/[id]` و`patients/[id]/summary` | بلا nav مباشر (وصول من القائمة) | `src/app/(dashboard)/patients/[id]/page.tsx` |
| `print/receipt/[invoiceId]` و`print/prescription/[id]` | أدوات طباعة بلا nav (مقصود) | `src/app/(dashboard)/print/**` |
| `book/[orgSlug]` + `patient-portal` + `patient-login` + صفحات auth + `/` + `~offline` | خارج السايدبار (مقصود) | `src/app/book/[orgSlug]/page.tsx`، `src/app/patient-portal/page.tsx` |
| `super/clinics/[orgId]` | تفاصيل بلا nav مباشر | `src/app/super/clinics/[orgId]/page.tsx` |

## i18n namespaces مكتشفة وربطها بالكود

القاموسان: `src/lib/i18n/dictionaries/en.ts` (~1863 سطر مطابق للنمط) و`ar.ts` (~1866) — الفارق أثر عدّ (3 سطور إنجليزية بمفتاحين)؛ التكافؤ الكامل يفرضه `tests/unit/i18n-parity.test.ts` + `navigation-consistency.test.ts` (8+4 تستات خضراء).

| البادئات | الربط |
|---|---|
| `nav_*` (+33 عنوانًا، منها `nav_insurance/nav_equipment/nav_integrations` الجديدة) | السايدبار + العناوين + البحث العام |
| `ins_*` (31) | `insurance/page.tsx` (سياسات/مطالبات/أهلية) |
| `eq_*` (22) | `equipment/page.tsx` (معايرة/صيانة) |
| `int_*` (20 + `int_paused` أُضيف أثناء هذا الجرد) | `integrations/page.tsx` (مفاتيح/webhooks) |
| `cfg_*` (23) | `feature-not-configured-banner.tsx` + الشارات |
| `rx_*/print/lab/vitals/ai/tp/trend` | الروشتات والسريريات |
| `billing/pay/inst/exp/pkg/plan` | الفوترة |
| `comm/camp/automation/reports/audit/analytics/feedback` | التواصل والتقارير |
| `patients/allergy/portal/book/appt/queue/waitlist/tele` | المرضى والجدولة |
| `settings/staff/security/super/auth/signup/dash/help` | النظام والإدارة |

## علامات كود غير مكتمل (TODO / mock / placeholder)

لا يوجد أي `TODO/FIXME/XXX/HACK` في `src/` (الmatch الوحيد هو regex كاشف الـ placeholders نفسه). الباقي بوابات تهيئة صريحة:

| الملف | المعنى | التصنيف |
|---|---|---|
| `src/lib/stripe.ts:3` (`sk_test_dummy`) | Stripe يعمل شكليًا بلا مفاتيح | dev-fallback |
| `src/lib/prisma.ts:33` (dummy proxy) | يرمي عند الاستخدام وقت البناء بلا DB | build-fallback |
| `src/lib/email.ts:48` (console provider) | يسجّل الرابط بدل إرساله | dev-fallback |
| `src/lib/communications.ts:70-76` (gmail ثابت `test`) | مسار بريد قديم | legacy — محتاج تأكيد يدوي |
| `src/lib/communications.ts:85,141` + `ai.ts:38` + `cloudinary.ts:39` + `fhir/[...path]:192` + `uploads:23` + `stripe/webhook:17` + `cron-auth.ts:33` | رسائل "not configured" صريحة | config-gate (يفشل مغلقًا) |
| `src/app/patient-portal/page.tsx:327,336,344,352,384` (`portal_comingSoon`) | 5 تبويبات معلنة قريبًا | gating حقيقي |
| `src/app/actions/patients.ts:7` ("auth not fully hooked up") | ملف قديم غير مستورد | ميت |
| `src/components/landing/*` (Mock topbar/chart/sparkline) | تسويق فقط | مقصود — يُتجاهل |
| `integrations/page.tsx:353` (`int_paused`) | كان مفتاحًا غائبًا | **أُصلح أثناء هذا الجرد** (أُضيف للقاموسين) |

## موديلز أو routes "ميتة"

| البند | الحكم | الدليل |
|---|---|---|
| `AppointmentEquipment` | ميت تمامًا (صفر استخدام) | grep `src/` |
| `PricingTier` | ميت (seed فقط) | grep `src/` |
| `FeedbackSurvey` | ميت كموديل (string في merge فقط) | `src/lib/patient-merge.ts:24` |
| `RolePermission` | nested فقط (signup) | `src/app/api/signup/route.ts:112,128` |
| `PatientSession` | عبر `patient-auth.ts` فقط | `src/lib/patient-auth.ts:21,107` |
| `EmergencyContact` | nested فقط | `src/app/api/patients/[id]/route.ts:77,121,213` |
| `PrescriptionItem` | nested فقط | `src/app/api/prescriptions/[id]/route.ts:109` |
| `InventoryTransaction` | nested فقط | `src/app/api/inventory/[id]/transaction/route.ts:48` |
| `WebhookDelivery` | عبر helper فقط | `src/lib/webhook-delivery.ts:66,87` |
| `src/app/actions/patients.ts` | غير مستورد إطلاقًا | grep repo-wide |
| `WS_URL` / `SEED_DEMO_DATA` في `.env.example` | غير مشار إليهما في `src/lib` | seed/docker فقط |

## Pending Super Admin Decisions

| البند | نوعه (بزنس/دفع) | الوضع الحالي في الكود | القرار المطلوب | السيرفيس المقترح (لو دفع) |
|---|---|---|---|---|
| F-FLAG1: توقيع سريري على الروشتة والحالة | بزنس | اتراجعت 2026-09-13: روشتة واحدة + ضغط واحد + I10 متسق؛ لا تكرار فعليًا | دكتور/مالك يؤكد أن الروشتة الوحيدة مقصودة ثم CLOSE | — |
| P4-T3: سياسة توليد الرسوم | بزنس | لا كود — محظور بقرار منتج (`PROGRESS.md:14`) | اعتماد السياسة التجارية | — |
| F-B1: سوق عام / صفحات SEO | بزنس | غير موجود؛ البحث يحذر منه كـ non-goal قريب | B2C استحواذ أم تشغيل فقط | — |
| F-B2: تطبيقات native | بزنس | PWA فقط (`manifest.ts` + Serwist + push) | هل يكفي PWA أم iOS/Android | — |
| F-B3: لغات إضافية + ولاء | بزنس | en/ar فقط؛ لا نقاط ولاء | نطاق اللغات والولاء | — |
| F-B6: مزامنة Google Calendar | بزنس | غير موجود؛ مستحيل البناء بلا بيانات اعتماد | توفير OAuth Client ID/Secret + منح الأطباء | Google Cloud (مجاني) |
| CRON_SECRET للإنتاج | بزنس/تشغيل | الكود يفشل مغلقًا بدونه (`src/lib/cron-auth.ts:28-36`) | توفير secret في بيئة الإنتاج | — |
| أسرار E2E/CI | بزنس/تشغيل | `e2e/journeys.spec.ts` مكتوب ولم يُنفذ قط | توفير E2E_* secrets + قاعدة تست | — |
| FHIR upstream للمستشفى/المعمل | بزنس/تشغيل | بروكسي عام يعمل عند `FHIR_BASE_URL` فقط | عنوان نظام المستشفى + توكن | — |
| F-B4: بوابة دفع محلية | دفع | Stripe فقط؛ الكاش/التحويل يدوي | اختيار vendor + حساب تاجر | **Paymob** (بطاقات + محافظ إلكترونية، API ناضج في مصر) + **Fawry** (مرجع نقدي للمرضى بلا بطاقات) — لأن InstaPay تحويلات بنكية بلا checkout API للتجار |
| F-B5: فيديو مُدار | دفع | تنسيق روابط فقط؛ "no fake rooms" (`telehealth_link/migration.sql:5`) | حساب vendor ومفاتيح | **Daily.co** (أرخص وأبسط من Twilio Video الذي أُغلق؛ WebRTC جاهز) |
| F-B3: clearinghouse تأمين حقيقي | دفع | فحص أهلية محلي فقط (`checkEligibility`) | vendor + نطاق (مصر: غالبًا تكامل مباشر مع شركات التأمين/PBM لا clearinghouse أمريكي) | تكامل مباشر مع payer (محتاج تأكيد يدوي للسوق) |
| Twilio (SMS/WhatsApp) | دفع | SDK مربوط + قوالب معتمدة؛ يعمل عند التهيئة | شحن رصيد + أرقام + قوالب WhatsApp معتمدة | **Twilio** نفسه (مربوط فعلًا)؛ بديل محلي للـ SMS البحت: **SmsMasr/Unifonic** (أرخص للرسائل المحلية) |
| Stripe (بطاقات/أونلاين) | دفع | مربوط + webhook idempotent؛ dummy عند الغياب | حساب + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | **Stripe** (مربوط)؛ يقابله محليًا F-B4 أعلاه |
| Cloudinary (ملفات/صور) | دفع | مربوط + فشل رشيق؛ الطبقة المجانية تكفي البداية | حساب + 3 مفاتيح | **Cloudinary** (مربوط؛ free tier كافٍ أولًا) |
| مفتاح AI (scribe/ملخص) | دفع | `openai`/`anthropic` عبر fetch؛ مغلق بدونه | مفتاح + اختيار مزود | **OpenAI** (متوافق مع `AI_BASE_URL` لأي بديل أرخص) |
| مزود بريد للإنتاج | دفع | `console` يسجّل فقط (devFallback) | SMTP أو Resend + `EMAIL_FROM` | **Resend** (أبسط) أو **Amazon SES** (أرخص حجمًا) |

## ملخص عام

- **الدومينات المكتشفة:** 12 (مصادقة/tenant، مرضى/بورتال، جدولة، سريريات، روشتات، معامل/FHIR، فوترة، تواصل، مخزون/معدات، مهام/تقارير، إعدادات/أمان، تكاملات/AI).
- **Routes:** 168 ملف `route.ts` (القائمة الكاملة في الملحق أ).
- **الصفحات:** 50 ملف `page.tsx` (35 تحت `(dashboard)` منها 2 طباعة، 11 عامة/auth، 1 بورتال، 3 سوبر).
- **أكبر 5 دومينات:** السريريات/EMR، المرضى + البورتال، الجدولة/التشغيل، الفوترة/RCM، المنصة/SaaS (tenant/auth/RBAC/plans/audit/mفاتيح/webhooks/سوبر).
- **أضعف الدومينات وضوحًا:** الـ clearinghouse التأميني (محلي فقط)، شبكة E-prescribe (غائبة)، vendor معمل/أشعة مسمّى (عام فقط)، السوق العام (غائب)، تطبيقات native (PWA فقط).
- **Pending Super Admin Decisions:** 17 بندًا، منها **8 تحتاج دفعًا** (بوابة محلية، فيديو، clearinghouse، Twilio، Stripe، Cloudinary، AI، بريد).
- **أدلة التنفيذ:** tenant-scoping + Zod + audit في معظم الكتابة، 77 ملف تست / 374 تست أخضر، بوابات تفشل مغلقة (fail-closed)، ولا `TODO/FIXME` في `src/`.
- **بنود التأكيد اليدوي المتبقية:** تطبيق مايجريشن `20260913/14` على Neon، مسار `communications.ts:70-76` البريدي القديم، سياسة audit لخطط السوبر.

## الملحق أ. قائمة API routes الكاملة (168)

`PATH -> METHODS` من قراءة `export` كل ملف (تشمل alias مثل `transmit/ingest`):

```text
/api/ai/scribe                         POST
/api/ai/summary                        POST
/api/analytics/dashboard               GET
/api/api-keys                          GET, POST
/api/api-keys/{id}/revoke              POST
/api/appointments                      GET, POST, PATCH
/api/appointments/{id}/check-in       POST, OPTIONS
/api/appointments/{id}/check-out      POST, OPTIONS
/api/appointments/{id}/no-show        POST, OPTIONS
/api/appointments/{id}/recurrence     POST
/api/appointments/{id}/telehealth     PATCH
/api/audit                             GET
/api/auth/[...nextauth]                GET, POST (delegated NextAuth)
/api/auth/2fa/disable                  POST
/api/auth/2fa/setup                    POST
/api/auth/2fa/status                   GET
/api/auth/2fa/verify                   POST
/api/auth/forgot-password              POST
/api/auth/resend-verification          POST
/api/auth/reset-password               POST
/api/auth/verify-email                 POST
/api/automation/signals                GET
/api/billing/invoices                  GET, POST
/api/book/{orgSlug}/appointments      POST (public)
/api/book/{orgSlug}/availability      GET (public)
/api/branches                          GET, POST
/api/branches/{id}                     PATCH
/api/catalogs                          GET, POST
/api/clinical-orders                   GET, POST
/api/clinical-templates                GET, POST
/api/clinical-templates/{id}           PATCH, DELETE
/api/communications                    GET, POST
/api/communications/appointment-reminders GET, POST
/api/communications/campaigns          GET, POST
/api/communications/campaigns/{id}/launch POST
/api/communications/scheduled          GET, POST
/api/config/status                     GET (auth required)
/api/consents                          GET, POST
/api/consents/{id}                     PATCH
/api/coupons                           GET, POST
/api/coupons/{id}                      PATCH
/api/cron/follow-up-escalation         POST
/api/documents                         GET, POST
/api/documents/{id}/download           GET
/api/documents/{id}/token              GET
/api/documents/generate                POST
/api/documents/templates               GET
/api/encounters                        GET, POST
/api/encounters/{id}                   PATCH
/api/encounters/{id}/notes             POST
/api/equipment                         GET, POST
/api/equipment/{id}/maintenance        GET, POST
/api/expenses                          GET, POST
/api/expenses/{id}                     DELETE
/api/feedback                          GET
/api/feedback/request                  POST
/api/health                            GET (public)
/api/insurance/claims                  GET, POST
/api/insurance/claims/{id}             PATCH
/api/insurance/policies                GET, POST
/api/insurance/policies/{id}/eligibility GET
/api/installment-plans                 GET, POST
/api/installment-plans/{id}            PATCH
/api/installment-plans/{id}/pay        POST
/api/integrations/fhir/{...path}       GET, POST
/api/intake-forms                      GET, POST
/api/intake-forms/{id}                 PATCH, DELETE
/api/intake-forms/{id}/fields          POST
/api/intake-responses                  GET
/api/inventory                         GET, POST
/api/inventory/{id}                    PATCH
/api/inventory/{id}/transaction        POST
/api/inventory/alerts                  GET, POST
/api/lab-orders                        GET, POST
/api/lab-orders/{id}                   PATCH
/api/lab-orders/{id}/ingest            POST (alias)
/api/lab-orders/{id}/transmit         POST (alias)
/api/lab-orders/{id}/{verb}            POST
/api/labs                             GET, POST
/api/notifications                     GET, POST
/api/notifications/{id}                PATCH
/api/notifications/push                POST, DELETE
/api/org/export                        GET
/api/org/request-upgrade               POST
/api/packages                          GET, POST
/api/patient-auth/login                POST
/api/patient-auth/logout               POST
/api/patient-auth/me                   GET
/api/patient-packages                  GET, POST
/api/patient-packages/{id}             PATCH, DELETE
/api/patient-packages/{id}/consume     POST
/api/patient-portal/appointments/{id}/cancel POST
/api/patient-portal/appointments/{id}/reschedule PATCH
/api/patient-portal/consents           GET, POST
/api/patient-portal/documents          GET
/api/patient-portal/feedback           GET, POST
/api/patient-portal/feedback/rateable  GET
/api/patient-portal/intake             GET, POST
/api/patient-portal/intake/forms       GET
/api/patient-portal/invoices           GET
/api/patient-portal/overview           GET
/api/patient-portal/payments           POST
/api/patients                          GET, POST
/api/patients/{id}                     GET, PATCH
/api/patients/{id}/allergies           GET, POST
/api/patients/{id}/allergies/{allergyId} PATCH, DELETE
/api/patients/{id}/archive             POST
/api/patients/{id}/attendance          GET
/api/patients/{id}/history             GET, POST
/api/patients/{id}/merge               POST
/api/patients/{id}/summary             GET
/api/payments                          GET, POST
/api/payments/{id}/refund              POST
/api/plan/entitlements                 GET
/api/prescription-templates            GET, POST
/api/prescription-templates/{id}       PATCH, DELETE
/api/prescription-templates/{id}/use   POST
/api/prescriptions                     GET, POST
/api/prescriptions/{id}                PATCH, DELETE (no GET)
/api/prescriptions/{id}/send           POST
/api/prescriptions/favorites           GET
/api/procedure-orders                  GET, POST
/api/procedure-orders/{id}             PATCH
/api/profile/availability              PATCH
/api/profile/avatar                    GET, PATCH
/api/queue                             GET
/api/queue/actions                     POST
/api/ready                             GET (public)
/api/reports/monthly                   GET
/api/reports/scheduled                 POST
/api/reports/schedules                 GET, POST
/api/reports/schedules/{id}            DELETE
/api/rooms                             GET, POST
/api/rooms/{id}                        PATCH
/api/settings                          GET, PATCH
/api/shifts                            GET, POST
/api/shifts/{id}                       DELETE
/api/signup                            POST
/api/staff                             GET, PATCH
/api/staff/roles                       GET, POST
/api/super/approvals                   GET
/api/super/audit                       GET
/api/super/orgs                        GET
/api/super/orgs/{orgId}/detail         GET
/api/super/orgs/{orgId}/override      GET, POST
/api/super/orgs/{orgId}/override/{overrideId} DELETE
/api/super/orgs/{orgId}/plan           POST
/api/super/orgs/{orgId}/status         POST
/api/super/orgs/{orgId}/upgrade        POST
/api/super/plans                       GET, POST
/api/super/plans/{id}                  GET, PATCH, DELETE
/api/super/plans/{id}/duplicate        POST
/api/super/settings                    GET, PUT, PATCH (alias)
/api/tasks                             GET, POST
/api/tasks/{id}                        PATCH
/api/treatment-plans                    GET, POST
/api/treatment-plans/{id}              PATCH, DELETE
/api/treatment-plans/{id}/steps        POST, PATCH
/api/uploads                           POST
/api/vitals                             GET, POST
/api/vitals/stream                      GET (SSE)
/api/vitals/trend                       GET
/api/waitlist                           GET, POST
/api/waitlist/{id}                      PATCH
/api/waitlist/{id}/book                 POST
/api/webhooks                           GET, POST
/api/webhooks/{id}                      PATCH, DELETE
/api/webhooks/stripe                    POST (signature, no session)
```