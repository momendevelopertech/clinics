# جرد خصائص قاعدة الكود — OpenHealthCRM / HealthCRM
> تاريخ الفحص: 2026-09-12
> منهجية الأدلة: هذا الجرد مبني فقط على الكود الموجود فعليًا، وملف Prisma، والـ migrations، وملفات الترجمة، والمراجع الساكنة. لا يفترض خصائص غير منفذة.
> التقنية: Next.js 16.1.6 App Router، React 19.2.3، TypeScript 5.9.3، Prisma 7.4.2، PostgreSQL، NextAuth 4، Tailwind CSS 4، Radix/shadcn-style UI، Zod 4، Vitest، Playwright.
> مصادر الحقيقة: [package.json](package.json)، [prisma/schema.prisma](prisma/schema.prisma)، ملفات `src/app/api/**/route.ts`، ملفات `src/app/**/page.tsx`، و[dashboard-with-collapsible-sidebar.tsx](src/components/ui/dashboard-with-collapsible-sidebar.tsx)، و[en.ts](src/lib/i18n/dictionaries/en.ts).

## 1. البنية العامة والتقنيات

### شكل المشروع
- `src/app`: صفحات Next App Router، مجموعة dashboard، صفحات الدخول والعامة، بوابة المريض، صفحات super-admin، API routes، service worker، وصفحة offline.
- `src/components`: مكونات الدومينات مثل المرضى والمواعيد واللقاءات والوصفات والمختبر والفوترة والمستندات والتواصل والتقارير والإعدادات، بالإضافة إلى مكونات UI المشتركة.
- `src/lib`: خدمات الدومينات، التفويض والـ tenant context، التدقيق، التحقق، التكاملات، i18n، PWA/offline، التقارير، الفوترة، الرسائل، AI، FHIR، والتخزين.
- `prisma`: schema وseed scripts و46 migration SQL.
- `tests/unit` و`tests/integration` و`e2e`: تغطية آلية لمعظم الدومينات الرئيسية.
- ملفات الإعداد الجذرية: Next وTypeScript وESLint وPostCSS/Tailwind وVitest وPlaywright وDocker Compose وVercel.

### المكتبات والتكاملات الموجودة فعليًا
- قاعدة البيانات: PostgreSQL من خلال `@prisma/client` و`@prisma/adapter-pg` و`pg`.
- المصادقة: NextAuth، جلسات patient-auth، تأكيد البريد وإعادة تعيين كلمة المرور، وTOTP 2FA.
- الفوترة: Stripe SDK، التحقق من Stripe webhooks، الدفع والاسترداد وidempotency.
- الرسائل: Twilio للـ SMS/WhatsApp، وNodemailer لـ SMTP/Gmail. حزمة Resend موجودة في dependencies، لكن helper الاتصالات الذي تم فحصه يستخدم Nodemailer/Twilio.
- الملفات: Cloudinary مع تحقق من الغرض ونوع MIME والحجم.
- التشغيل غير المتزامن: BullMQ وioredis معلنان؛ Redis اختياري للـ distributed rate limiting.
- الذكاء الاصطناعي: OpenAI-compatible أو Anthropic عبر HTTP، ومغلق افتراضيًا عند غياب الإعداد.
- التشغيل البيني: FHIR R4 proxy وwrite-back مقيدان، مع API-key authentication.
- PWA: Serwist وservice worker وتسجيل offline mutations وpush subscriptions وواجهات التثبيت والتحديث.
- الواجهة: Radix وlucide-react وreact-hook-form وZod وFramer Motion وSonner وPDF renderer وXLSX.

## 2. خريطة موديلات Prisma الكاملة

يحتوي schema على 69 موديلًا. أسماء الحقول والعلاقات أدناه منسوخة كما هي من [prisma/schema.prisma](prisma/schema.prisma)، لأن هذه الأسماء هي العقد الفعلية في الكود.

| الموديل | كل الحقول المعلنة | العلاقات ودليل دورة الحياة |
|---|---|---|
| Organization | `id, name, slug, phone, address, city, country, status, plan, onboardingSource, settingsJson, upgradeRequestedPlan, upgradeRequestedAt, upgradeNote, timezone, currency, createdAt, updatedAt, users, patients, branches, appointments, encounters, tasks, communications, auditLogs, roles, rooms, equipment, equipmentMaintenances, invoices, insuranceClaims, inventoryItems, campaigns, documents, pricingTiers, waitlistEntries, prescriptions, serviceCatalogs, clinicalCatalogs, patientHistories, diagnoses, followUps, labOrders, labResults, notifications, procedureOrders, subscription, entitlementOverrides, pushSubscriptions, coupons, installmentPlans, shifts, expenses, clinicalTemplates, servicePackages, patientPackages, treatmentPlans, feedbacks, intakeForms, intakeResponses, patientAllergies, reportSchedules, apiKeys, webhooks, medicationFavorites, prescriptionTemplates` | الـ tenant الجذر. `status`: pending/active/suspended، و`plan`: free/clinic/plus. |
| Plan | `id, code, internalCode, nameEn, nameAr, descriptionEn, descriptionAr, price, billingCycle, status, displayOrder, popular, trialDays, modulesJson, featuresJson, upgradeTargetId, downgradeTargetIdsJson, downgradesAllowed, createdAt, updatedAt, upgradeTarget, upgradedFrom, subscriptions` | `status`: active/archived، مع self-relation لمسار الترقية. |
| Subscription | `id, organizationId, planId, status, currentPeriodStart, currentPeriodEnd, trialEndsAt, cancelAtPeriodEnd, canceledAt, billingCycle, notes, createdAt, updatedAt, organization, plan` | `status`: trialing/active/past_due/canceled/expired؛ اشتراك واحد للمؤسسة. |
| EntitlementOverride | `id, organizationId, moduleKey, featureKey, kind, valueJson, reason, createdById, expiresAt, createdAt, updatedAt, organization` | override للموديول أو feature أو limit، مع expiry. |
| WaitlistEntry | `id, organizationId, patientId, preferredDate, notes, status, createdAt, updatedAt, organization, patient` | `status`: waiting/offered/cancelled. |
| User | `id, organizationId, email, name, passwordHash, avatarUrl, avatarPublicId, active, emailVerified, verifyTokenHash, verifyTokenExp, resetTokenHash, resetTokenExp, specialty, licenseNumber, workingHours, branchId, roomId, consultationFee, availabilityType, availableDays, availableFrom, availableTo, role, totpSecret, totpEnabled, totpBackupCodes, totpEnabledAt, createdAt, updatedAt, organization, branch, room, userRoles, appointmentsAsProvider, tasksAssigned, tasksCreated, auditLogs, encounterNotes, prescriptions, labOrders, reviewedLabResults, procedureOrders, notifications, pushSubscriptions, shifts, medicationFavorites, prescriptionTemplates` | هوية الموظف والمقدم والأدوار والتوافر و2FA؛ `active` و`emailVerified` بوابتان تشغيليتان. |
| Role | `id, organizationId, name, createdAt, updatedAt, organization, permissions, userRoles` | دور خاص بالمؤسسة. |
| RolePermission | `id, roleId, action, resource, createdAt, role` | ورقة صلاحية؛ لا يوجد له route مباشر. |
| UserRole | `id, userId, roleId, createdAt, user, role` | إسناد دور للمستخدم مع uniqueness. |
| Patient | `id, organizationId, mrn, firstName, lastName, dateOfBirth, gender, email, phone, phoneSecondary, marketingOptOut, address, city, state, zip, country, bloodType, allergies, primaryCareProvider, passwordHash, sensitiveDataEncrypted, familyHistory, status, createdAt, updatedAt, organization, appointments, encounters, tasks, communications, consents, vitals, prescriptions, labResults, labOrders, procedureOrders, insurancePolicies, invoices, documents, waitlistEntries, sessions, histories, diagnoses, followUps, insuranceClaims, installmentPlans, patientPackages, treatmentPlans, feedbacks, intakeResponses, patientAllergies, emergencyContact` | `status`: Active/Inactive/Archived؛ يجمع الملف والبوابة والبيانات السريرية والمالية. |
| PatientAllergy | `id, organizationId, patientId, allergen, severity, reaction, onset, active, createdAt, updatedAt, organization, patient` | `active`: true/false؛ توجد CRUD routes. |
| PatientSession | `id, patientId, tokenHash, expiresAt, revokedAt, ipAddress, userAgent, createdAt, updatedAt, patient` | جلسة بوابة المريض؛ لا يوجد staff route مباشر. |
| PatientHistory | `id, organizationId, patientId, category, title, details, onsetDate, resolvedAt, status, createdAt, updatedAt, organization, patient` | `status`: active افتراضيًا؛ توجد GET/POST routes. |
| EmergencyContact | `id, patientId, name, relationship, phone, email, contactDataEncrypted, patient` | جزء من ملف المريض؛ لا يوجد route مستقل. |
| Consent | `id, patientId, organizationId, consentType, isGranted, documentUrl, signedAt, createdAt, updatedAt, patient` | routes للموظف والبوابة؛ `isGranted` هي الحالة. |
| Branch | `id, organizationId, name, address, city, state, zip, country, phone, email, status, workingHours, createdAt, updatedAt, organization, rooms, appointments, staff, shifts, expenses` | `status`: active/inactive. |
| Shift | `id, organizationId, userId, branchId, weekday, startTime, endTime, note, createdAt, updatedAt, organization, user, branch` | جدول المناوبات الأسبوعي؛ GET/POST وDELETE. |
| Appointment | `id, organizationId, branchId, patientId, providerId, roomId, startTime, endTime, bufferMinutes, appointmentType, telehealthUrl, status, notes, tokenNumber, isWalkIn, cancellationReason, checkedInAt, checkedOutAt, idempotencyKey, isRecurring, recurrenceRule, reminder24hSent, reminder1hSent, createdAt, updatedAt, organization, branch, patient, provider, room, encounter, equipmentSlots, feedbacks` | `status`: scheduled/arrived/in_progress/completed/cancelled/no_show؛ توجد check-in/out وno-show وrecurrence وtelehealth وbooking. |
| AppointmentEquipment | `id, appointmentId, equipmentId, allocatedAt, appointment, equipment` | join model؛ لا يوجد API مباشر. |
| Room | `id, organizationId, branchId, name, number, type, status, workingHours, createdAt, updatedAt, organization, branch, appointments, staff` | `status`: active/inactive. |
| Equipment | `id, organizationId, name, type, lastCalibrationAt, nextCalibrationAt, status, createdAt, updatedAt, organization, appointmentSlots, maintenances` | `status`: active/warning/maintenance_required/inactive؛ توجد routes للمعدات والصيانة. |
| EquipmentMaintenance | `id, organizationId, equipmentId, type, status, description, technician, performedAt, dueAt, cost, notes, createdAt, updatedAt, organization, equipment` | `type`: preventive/corrective/calibration؛ `status`: scheduled/completed/overdue. |
| Encounter | `id, organizationId, patientId, appointmentId, startTime, endTime, status, encounterType, createdAt, updatedAt, organization, patient, appointment, notes, vitals, prescriptions, diagnoses, followUps, labOrders, procedureOrders, invoiceLineItems, treatmentPlans` | `status`: in_progress/completed؛ جذر مساحة العمل السريرية. |
| EncounterNote | `id, encounterId, authorId, noteType, subjective, objective, assessment, plan, text, templateId, createdAt, updatedAt, encounter, author` | ملاحظات SOAP أو freeform. |
| Vital | `id, patientId, encounterId, weightKg, heightCm, bloodPressureSystolic, bloodPressureDiastolic, heartRate, bmi, spO2, temperature, recordedAt, patient, encounter` | routes للتسجيل والقراءة والـ trend والـ stream. |
| Prescription | `id, organizationId, patientId, encounterId, prescribedById, medicationName, dosage, frequency, duration, instructions, status, idempotencyKey, sentToPharmacy, createdAt, updatedAt, organization, patient, encounter, prescriber, items` | `status`: active/completed/cancelled؛ إرسال وطباعة ونسخ وقوالب. |
| PrescriptionItem | `id, prescriptionId, medicationName, dosage, frequency, duration, instructions, createdAt, prescription` | سطر دواء منظم؛ لا يوجد route مستقل. |
| Diagnosis | `id, organizationId, patientId, encounterId, system, code, name, notes, status, createdAt, updatedAt, organization, patient, encounter` | `status`: active افتراضيًا؛ يظهر عبر مسارات encounter/clinical order. |
| FollowUp | `id, organizationId, patientId, encounterId, dueDate, reason, instructions, status, createdAt, updatedAt, organization, patient, encounter` | `status`: planned؛ يظهر في automation signals. |
| LabResult | `id, organizationId, patientId, orderId, testName, resultValue, unit, referenceRange, status, performedAt, reportUrl, reviewedById, reviewedAt, reviewNote, createdAt, updatedAt, organization, patient, order, reviewedBy` | `status`: pending/completed/abnormal/reviewed. |
| LabOrder | `id, organizationId, patientId, encounterId, orderedById, orderType, testName, priority, indication, transmittedAt, externalRef, status, orderedAt, results, createdAt, updatedAt, organization, patient, encounter, orderedBy` | `status`: ordered/collected/resulted/reviewed/cancelled؛ `priority`: routine/urgent/stat. |
| Invoice | `id, organizationId, patientId, invoiceNumber, currency, status, totalAmount, amountPaid, dueDate, idempotencyKey, couponCode, orderDiscount, createdAt, updatedAt, organization, patient, lineItems, payments, insuranceClaims, installmentPlans` | `status`: draft/sent/partially_paid/paid/overdue. |
| InvoiceLineItem | `id, invoiceId, serviceCatalogId, description, quantity, unitPrice, discountAmount, taxAmount, amount, cptCode, createdAt, encounterId, invoice, serviceCatalog, encounter` | تفصيل فاتورة يرتبط اختياريًا بالخدمة والـ encounter. |
| Coupon | `id, organizationId, code, kind, value, active, expiresAt, createdAt, updatedAt, organization` | `kind`: percent/fixed؛ `active` والانتهاء مستخدمان في منطق الفوترة. |
| InstallmentPlan | `id, organizationId, invoiceId, patientId, totalAmount, downPayment, status, notes, createdAt, updatedAt, organization, invoice, patient, installments` | `status`: active/completed/cancelled. |
| Installment | `id, planId, dueDate, amount, status, paidAt, paymentId, createdAt, updatedAt, plan, payment` | `status`: pending/paid/overdue/cancelled؛ العملية تتم عبر الخطة الأب. |
| Expense | `id, organizationId, branchId, category, amount, spentAt, notes, createdAt, updatedAt, organization, branch` | GET/POST ومحو حسب id. |
| ClinicalTemplate | `id, organizationId, name, specialty, noteType, subjective, objective, assessment, plan, isDefault, createdAt, updatedAt, organization` | CRUD لقوالب SOAP/freeform. |
| ServicePackage | `id, organizationId, name, serviceCatalogId, procedureName, totalSessions, price, active, createdAt, updatedAt, organization, serviceCatalog, patientPackages` | كتالوج جلسات مدفوعة مقدمًا؛ `active` boolean. |
| PatientPackage | `id, organizationId, patientId, packageId, sessionsTotal, sessionsUsed, status, pricePaid, createdAt, updatedAt, organization, patient, package` | `status`: active/completed/cancelled؛ consume يزيد الاستخدام. |
| TreatmentPlan | `id, organizationId, patientId, encounterId, title, notes, status, createdAt, updatedAt, organization, patient, encounter, steps` | `status`: draft/active/completed/cancelled. |
| TreatmentPlanStep | `id, planId, kind, refId, title, dueDate, status, createdAt, updatedAt, plan` | `kind`: diagnosis/prescription/procedure/followup/note؛ `status`: pending/done/skipped. |
| Feedback | `id, organizationId, patientId, appointmentId, providerId, rating, comment, source, createdAt, organization, patient, appointment` | `source`: portal/staff/auto؛ rating من 1 إلى 5. |
| IntakeForm | `id, organizationId, name, description, active, createdAt, updatedAt, organization, fields, responses` | `active` boolean؛ CRUD للنموذج والحقول وقراءة الردود. |
| IntakeField | `id, formId, key, label, labelAr, kind, required, options, position, createdAt, form` | `kind`: text/multiline/number/date/boolean/choice. |
| IntakeResponse | `id, organizationId, formId, patientId, appointmentId, answers, createdAt, organization, form, patient` | إجابات JSON؛ قراءة وكتابة للموظف والبوابة. |
| ReportSchedule | `id, organizationId, frequency, dayOfMonth, recipients, active, lastSentAt, createdAt, updatedAt, organization` | إعداد إرسال التقارير المجدول. |
| Payment | `id, invoiceId, amount, paymentMethod, stripePaymentId, status, refundedAmount, refundKey, updatedAt, createdAt, invoice, installments` | `status`: pending/completed/failed/refunded؛ Stripe events والاسترداد اليدوي. |
| InsurancePolicy | `id, patientId, provider, policyNumber, groupNumber, type, createdAt, updatedAt, patient` | `type`: primary/secondary؛ routes للوثيقة وeligibility. |
| InsuranceClaim | `id, organizationId, patientId, invoiceId, claimNumber, status, amountClaimed, amountPaid, denialReason, submittedAt, paidAt, createdAt, updatedAt, organization, patient, invoice` | `status`: submitted/pending/paid/denied/appeal. |
| PricingTier | `id, organizationId, name, description, createdAt, organization` | لا يوجد route مباشر؛ يبدو دعمًا للـ seed/catalog. |
| ServiceCatalog | `id, organizationId, code, name, description, category, durationMins, price, active, createdAt, updatedAt, organization, procedureOrders, invoiceLineItems, servicePackages` | CRUD عبر `/api/catalogs`؛ `active` boolean. |
| ClinicalCatalog | `id, organizationId, system, code, name, category, description, active, createdAt, updatedAt, organization` | كتالوج رموز سريرية عبر `/api/catalogs`. |
| InventoryItem | `id, organizationId, name, sku, category, quantity, reorderLevel, unit, expiryDate, batchNumber, createdAt, updatedAt, organization, transactions` | مخزون وتنبيهات انتهاء الصلاحية ومستوى إعادة الطلب. |
| InventoryTransaction | `id, itemId, type, quantity, reason, createdAt, item` | `type`: restock/usage/adjustment؛ العملية nested داخل item. |
| Communication | `id, organizationId, patientId, channel, type, status, content, scheduledFor, sentAt, createdAt, updatedAt, organization, patient` | `channel`: sms/email/whatsapp؛ `status`: pending/sent/delivered/failed. |
| Campaign | `id, organizationId, name, type, status, triggerType, createdAt, updatedAt, organization` | `type`: drip/broadcast؛ `status`: draft؛ يوجد launch route. |
| FeedbackSurvey | `id, patientId, encounterId, npsScore, feedback, sentAt, respondedAt, createdAt` | لا يوجد استخدام route-level؛ مختلف عن `Feedback`. |
| Task | `id, organizationId, title, description, status, priority, dueDate, patientId, assigneeId, creatorId, taskType, createdAt, updatedAt, organization, patient, assignee, creator` | `status`: open/in_progress/completed/cancelled؛ `priority`: low/medium/high/urgent. |
| Document | `id, organizationId, patientId, procedureOrderId, name, type, storageKey, publicId, mimeType, createdAt, organization, patient, procedureOrder` | `type`: imaging/lab_report/consent/id؛ التخزين عبر Cloudinary. |
| ProcedureOrder | `id, organizationId, patientId, encounterId, orderedById, serviceCatalogId, procedureName, status, scheduledAt, notes, completedAt, createdAt, updatedAt, organization, patient, encounter, orderedBy, serviceCatalog, documents` | `status`: ordered افتراضيًا؛ توجد حقول الإكمال. |
| AuditLog | `id, organizationId, userId, actorType, actorIdentifier, action, entityType, entityId, beforeState, afterState, ipAddress, userAgent, createdAt, organization, user` | append-only؛ actorType هو user/patient/system/webhook؛ actions هي CREATE/UPDATE/DELETE. |
| Notification | `id, organizationId, recipientId, channel, title, body, entityType, entityId, status, deliveredAt, readAt, failureReason, createdAt, organization, recipient` | `status`: unread؛ routes للقراءة والتحديث والـ push. |
| PushSubscription | `id, userId, organizationId, endpoint, p256dh, auth, userAgent, createdAt, updatedAt, user, organization` | دورة اشتراك browser push. |
| ApiKey | `id, organizationId, name, prefix, keyHash, scopes, active, lastUsedAt, createdAt, updatedAt, organization` | إنشاء/عرض/إلغاء API keys؛ scopes بصيغة JSON. |
| Webhook | `id, organizationId, url, secretHash, eventTypes, active, createdAt, updatedAt, organization, deliveries` | CRUD للـ webhook؛ التسليم يصدر من FHIR/payment. |
| WebhookDelivery | `id, webhookId, eventType, attempt, status, payload, responseStatus, responseBody, error, deliveredAt, createdAt, webhook` | `status`: pending/delivered/failed؛ يديره helper وليس صفحة مباشرة. |
| MedicationFavorite | `id, organizationId, userId, medicationName, defaultDosage, defaultFrequency, defaultDuration, usageCount, lastUsedAt, createdAt, organization, user` | lookup ودعم استخدام الوصفات. |
| PrescriptionTemplate | `id, organizationId, createdById, name, specialty, isShared, items, usageCount, createdAt, updatedAt, organization, createdBy` | CRUD/use للقوالب؛ shared/private في UI/API. |

### مقارنة الـ schema بالـ migrations والاستخدام
كل الموديلات الـ69 لها مرجع نصي على الأقل في `src` أو `prisma/seed.js`. مجلد migrations يحتوي 46 migration تغطي الإضافات والتقوية اللاحقة. لم يوجد موديل بلا أي مرجع source/seed.

لكن هذه الموديلات لا يظهر لها استخدام مباشر بصيغة `prisma.<model>` داخل route handler: `RolePermission`, `PatientSession`, `EmergencyContact`, `AppointmentEquipment`, `PrescriptionItem`, `Installment`, `PricingTier`, `InventoryTransaction`, `FeedbackSurvey`, `WebhookDelivery`. هذا لا يثبت أنها ميتة؛ بعضها nested writes أو join models أو تستخدمها helpers أو seed فقط.

يوجد migration بتاريخ `20260913000000_lab_exchange` وآخر بتاريخ `20260914000000_equipment_maintenance`، وهما بعد تاريخ الفحص `2026-09-12`. هذا anomaly في تاريخ migrations يحتاج تأكيدًا يدويًا، وليس إثباتًا لحالة قاعدة البيانات.

## 3. الدومينات والخصائص الفعلية

### المصادقة والـ tenant وRBAC والخطط
*الموديلات:* `Organization`, `User`, `Role`, `RolePermission`, `UserRole`, `Plan`, `Subscription`, `EntitlementOverride`, `PatientSession`.

*الـ API الفعلي:*
- `/api/auth/[...nextauth]`: handler مفوض إلى NextAuth للمصادقة والجلسات.
- `/api/auth/forgot-password` و`reset-password` و`verify-email` و`resend-verification`: تدفقات البريد والتوكنات والتحقق.
- `/api/auth/2fa/setup` و`verify` و`status` و`disable`: إعداد وقراءة وتعطيل TOTP.
- `/api/signup`: إنشاء المؤسسة والمالك وبيانات onboarding/seed، مع validation وaudit.
- `/api/plan/entitlements`: resolve للموديولات والميزات الخاصة بالمؤسسة.
- `/api/org/request-upgrade`: حفظ طلب الترقية.
- `/api/super/plans` و`/api/super/plans/{id}` و`duplicate`: إدارة كتالوج الخطط للـ super-admin.
- `/api/super/orgs` و`{orgId}/detail`: عرض المؤسسات.
- `/api/super/orgs/{orgId}/status` و`plan` و`upgrade`: عمليات المؤسسة والخطة.
- `/api/super/orgs/{orgId}/override` و`{overrideId}`: إنشاء وعرض وحذف entitlement overrides.
- `/api/super/approvals` و`/audit` و`/settings`: موافقات وتدقيق وإعدادات المنصة.

*الربط بالواجهة:* [plan/page.tsx](src/app/(dashboard)/plan/page.tsx)، [super/page.tsx](src/app/super/page.tsx)، [super/plans/page.tsx](src/app/super/plans/page.tsx)، [plan-dashboard.tsx](src/components/plan/plan-dashboard.tsx)، [super-console.tsx](src/components/super/super-console.tsx)، [plans-manager.tsx](src/components/super/plans-manager.tsx)، و[dashboard-with-collapsible-sidebar.tsx](src/components/ui/dashboard-with-collapsible-sidebar.tsx).

*الفجوات:* `RolePermission` أساسي لكن لا يوجد route مستقل لإدارته؛ إدارة الأدوار تتم عبر staff routes. مسارات super-admin للخطط لم يظهر لها audit بنفس وضوح معظم tenant mutations، وتحتاج مراجعة يدوية للسياسة.

### المرضى والبوابة والموافقات
*الموديلات:* `Patient`, `PatientAllergy`, `PatientHistory`, `EmergencyContact`, `PatientSession`, `Consent`, `InsurancePolicy`, `Feedback`, `IntakeResponse`, `Document`.

*الموجود فعليًا:*
- `/api/patients` GET/POST و`{id}` GET/PATCH: قائمة وإنشاء وتعديل المرضى مع tenant scoping وvalidation وaudit.
- `archive` و`merge` و`summary` و`attendance` و`history`: أرشفة/دمج/ملخص/حضور/تاريخ المريض.
- `allergies` و`{allergyId}`: CRUD للحساسيات.
- `/api/consents`: CRUD للموافقات للموظف.
- `/api/insurance/policies` و`eligibility`، و`/api/insurance/claims`: حفظ الوثائق والمطالبات ودورة حالتها.
- `/api/patient-auth/login|logout|me`: جلسات بوابة المريض.
- `/api/patient-portal/overview` وعمليات إلغاء/إعادة جدولة المواعيد، والموافقات والمستندات والفواتير والمدفوعات.
- `/api/patient-portal/feedback` و`rateable`: التقييمات.
- `/api/patient-portal/intake/forms` و`intake`: عرض النماذج وإرسال الردود.

*الواجهة:* صفحات المرضى والبوابة، و[add-patient-dialog.tsx](src/components/patients/add-patient-dialog.tsx)، و[patient-profile-sheet.tsx](src/components/patients/patient-profile-sheet.tsx)، و[patient-allergies-card.tsx](src/components/patients/patient-allergies-card.tsx)، و[merge-patients-dialog.tsx](src/components/patients/merge-patients-dialog.tsx)، و[portal-intake-card.tsx](src/components/portal/portal-intake-card.tsx). يذكر `MedicalContext` صراحة أن mock data الأولية أزيلت وأن البيانات تأتي من API.

*الفجوات:* `EmergencyContact` جزء من graph المريض بلا route مستقل. Insurance له API لكن لا توجد له صفحة أو nav item في dashboard.

### المواعيد والحجز والانتظار والفروع والغرف والمناوبات
*الموديلات:* `Appointment`, `Branch`, `Room`, `Shift`, `AppointmentEquipment`, `WaitlistEntry`, `Equipment`.

*الموجود فعليًا:*
- `/api/appointments` GET/POST/PATCH: list/create/update مع conflict وidempotency وtenant وaudit.
- `check-in` و`check-out` و`no-show`: عمليات الاستقبال ودورة الزيارة.
- `recurrence` و`telehealth`: تكرار الموعد ورابط الاجتماع HTTPS.
- `/api/book/{orgSlug}/availability` و`appointments`: الحجز العام حسب المؤسسة.
- `/api/queue` و`queue/actions`: قائمة اليوم وcall/complete/no-show.
- `/api/branches` و`rooms` و`shifts` و`profile/availability`: إدارة المواقع والمناوبات والتوافر.
- `/api/waitlist` و`{id}/book`: إنشاء وتعديل وحجز من قائمة الانتظار.
- `/api/equipment` و`{id}/maintenance`: المعدات وجدول الصيانة.

*دورة الحياة:* Appointment: `scheduled -> arrived -> in_progress -> completed` مع بدائل `cancelled/no_show`. Waitlist: `waiting/offered/cancelled`. الصيانة: `scheduled/completed/overdue`.

*الواجهة:* صفحات appointments وqueue وwaitlist وlocations وavailability، ومكونات calendar وbooking وrecurring وtelehealth وwaitlist وreception board.

*الفجوات:* `AppointmentEquipment` schema-only على مستوى routes، ولا توجد صفحة nav مستقلة لتخصيص المعدات. الحجز العام منفصل عن staff appointment page.

### الرعاية السريرية والوصفات والخطط
*الموديلات:* `Encounter`, `EncounterNote`, `Vital`, `Prescription`, `PrescriptionItem`, `Diagnosis`, `FollowUp`, `ClinicalTemplate`, `TreatmentPlan`, `TreatmentPlanStep`, `MedicationFavorite`, `PrescriptionTemplate`, `LabOrder`, `LabResult`, `ProcedureOrder`.

*الموجود فعليًا:*
- `/api/encounters` و`{id}` و`{id}/notes`: إنشاء وتعديل اللقاءات والملاحظات السريرية/SOAP.
- `/api/vitals` و`trend` و`stream`: تسجيل المؤشرات وقراءة الاتجاه والبث.
- `/api/prescriptions` و`{id}` و`send` و`favorites`: CRUD وإرسال الوصفة والمفضلة.
- `/api/prescription-templates` و`{id}/use`: القوالب القابلة لإعادة الاستخدام.
- `/api/clinical-templates`: قوالب ملاحظات اللقاء.
- `/api/treatment-plans` و`{id}/steps`: الخطط والخطوات.
- `/api/ai/summary` و`/api/ai/scribe`: مساعدة AI للتلخيص وSOAP، وتتعطل عندما لا يكون provider/key مضبوطًا.
- `/api/clinical-orders` و`/api/procedure-orders`: أوامر سريرية وإجرائية.

*الواجهة:* encounters workspace وAI assist وprescription dialogs وclone/repeat buttons وtreatment plans وprint/send components.

*الفجوات:* `PrescriptionItem` nested بلا route مستقل. `Diagnosis` و`FollowUp` معرفان ومستخدمان في summaries/automation لكن بلا CRUD route مستقل. `FeedbackSurvey` مختلف عن `Feedback` المنفذ.

### المختبر وFHIR والمستندات
*الموديلات:* `LabOrder`, `LabResult`, `ProcedureOrder`, `Document`, `ServiceCatalog`, `ApiKey`, `Webhook`, `WebhookDelivery`.

*الموجود فعليًا:*
- `/api/labs` و`/api/lab-orders`: قراءة وإنشاء وتعديل طلبات المختبر.
- `/api/lab-orders/{id}/{verb}` و`transmit` و`ingest`: عمليات exchange؛ الأخيرتان alias exports للـ POST.
- `/api/documents` و`generate` و`download` و`token` و`templates`: رفع وقائمة وتوليد وتنزيل وتوكن ومستندات templates.
- `/api/uploads`: رفع Cloudinary مع validation.
- `/api/integrations/fhir/{...path}`: FHIR read proxy وwrite-back لـ Patient/Observation، مع صلاحية session أو API key.
- `/api/api-keys` و`revoke`: دورة API keys.
- `/api/webhooks` و`{id}`: تسجيل وتعديل وحذف webhooks.

`FHIR_BASE_URL` هو upstream فعلي اختياري. الكود يقيد الموارد والاستعلامات، ويتحقق من ملكية المريض للـ tenant، ويصدر webhook/audit عند الكتابة. أما `lab-exchange.ts` فيبني `DiagnosticRequest` بصيغة FHIR لكنه يصف تسليمًا عبر portal/email، لا مزود مختبر محدد.

*الفجوات:* لا يوجد LIS أو imaging vendor مسمى في `.env.example`. FHIR عام ومغلق بدون `FHIR_BASE_URL`. `WebhookDelivery` يدار بشكل غير مباشر ولا توجد له صفحة dashboard.

### الفوترة والمدفوعات والمطالبات والباقات والمصروفات
*الموديلات:* `Invoice`, `InvoiceLineItem`, `Payment`, `Coupon`, `InstallmentPlan`, `Installment`, `InsuranceClaim`, `InsurancePolicy`, `Expense`, `ServicePackage`, `PatientPackage`, `PricingTier`, `Subscription`.

*الموجود فعليًا:*
- `/api/billing/invoices`: إنشاء وقائمة الفواتير مع totals وcatalog lines وcoupons وidempotency.
- `/api/payments` و`refund`: إنشاء وعرض واسترداد يدوي.
- `/api/installment-plans` و`pay`: الخطط وتقسيم الدفع.
- `/api/coupons`: CRUD للكوبونات.
- insurance policies/eligibility وclaims: حفظ ومعالجة بيانات التأمين.
- `/api/packages` و`/api/patient-packages` و`consume`: كتالوج الباقات وإسناد الجلسات واستهلاكها.
- `/api/expenses`: المصروفات.
- patient portal invoices/payments.
- `/api/webhooks/stripe`: يتحقق من signature ويطبق transitions idempotent للنجاح والفشل والاسترداد ويحدث الفاتورة ويسجل audit.

Stripe تكامل حقيقي، لكنه يستخدم `sk_test_dummy` عند غياب `STRIPE_SECRET_KEY`. لا يظهر gateway آخر في الكود. `PricingTier` بلا route مباشر، وInsurance له API بلا dashboard page مقابلة.

### الاتصالات والحملات والإشعارات والتقارير
*الموديلات:* `Communication`, `Campaign`, `Notification`, `PushSubscription`, `ReportSchedule`, `Feedback`.

*الموجود فعليًا:*
- `/api/communications` و`scheduled` و`appointment-reminders`: الرسائل المجدولة والتذكيرات.
- `/api/communications/campaigns` و`{id}/launch`: الحملات وإطلاقها.
- `/api/notifications` و`{id}` و`push`: إشعارات داخلية وbrowser push.
- `/api/reports/monthly` و`schedules` و`scheduled`: التقارير الشهرية وجدولتها وتشغيلها.
- `/api/feedback` و`feedback/request`: قراءة وطلب التقييمات.

`src/lib/communications.ts` يستخدم Twilio عند ضبط `TWILIO_ACCOUNT_SID` للـ SMS/WhatsApp، ويستخدم Nodemailer للبريد. لا يوجد مزود WhatsApp غير Twilio. القوالب المعتمدة hardcoded لكن التسليم provider-backed عند الإعداد.

*الفجوة:* متغيرات Twilio المستخدمة في الكود لا تظهر في `.env.example` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`). مسارات cron تحتاج `CRON_SECRET` في production.

### المخزون والإعدادات والمستندات والدعم التشغيلي
*الموديلات:* `InventoryItem`, `InventoryTransaction`, `Equipment`, `EquipmentMaintenance`, `Task`, `Document`, `Branch`, `Room`, `User`.

*الموجود فعليًا:* `/api/inventory` و`transaction` و`alerts`، و`/api/tasks`، و`/api/settings`، و`/api/profile/avatar`، و`/api/org/export`، و`/api/audit`، و`/api/health`، و`/api/ready`.

الـ mutations تستخدم tenant-scoped validation/audit. تصدير المؤسسة owner-protected ويصدر JSON snapshot/checksum. readiness يفحص PostgreSQL بـ `SELECT 1`، بينما health liveness فقط ولا يفحص dependencies.

## 4. صفحات Dashboard مقابل الـ Navigation

### الصفحات الموجودة
مجموعة dashboard تحتوي 34 صفحة:

`/analytics`, `/appointments`, `/audit`, `/automation`, `/availability`, `/billing`, `/campaigns`, `/catalogs`, `/communications`, `/consents`, `/dashboard`, `/documents`, `/encounters`, `/help`, `/inventory`, `/labs`, `/locations`, `/patients`, `/patients/[id]`, `/patients/[id]/summary`, `/payments`, `/plan`, `/prescriptions`, `/print/prescription/[id]`, `/print/receipt/[invoiceId]`, `/queue`, `/reports`, `/security`, `/settings`, `/staff`, `/tasks`, `/waitlist`.

صفحات التطبيق الأخرى: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/demo-accounts`, `/patient-login`, `/patient-portal`, `/book/[orgSlug]`, `/suspended`, `/~offline`, `/super`, `/super/plans`, `/super/clinics/[orgId]`.

### عناصر nav بلا صفحة وصفحات بلا nav
| العنصر | النتيجة | الدليل |
|---|---|---|
| `/staff` | الصفحة موجودة | sidebar و`staff/page.tsx` |
| `/super?section=...` و`/super/plans` | الصفحات موجودة؛ query sections يتعامل معها super console | sidebar وصفحات super |
| صفحات print للروشتة والإيصال | بلا nav، وهي routes خدمية مقصودة | مرتبطة من feature components |
| صفحات patient detail/summary | بلا nav، يتم الوصول إليها من قائمة المرضى | ملفات الصفحات ومكونات المرضى |
| insurance policies/claims | API موجود بلا dashboard nav/page | `src/app/api/insurance/**` |
| intake forms | UI داخل settings بلا nav مستقل | `src/components/settings/intake-forms-manager.tsx` |
| equipment/maintenance | API/UI موجود بلا nav/page مستقل | `src/app/api/equipment/**` |

لم يوجد sidebar href يشير إلى صفحة غير موجودة. الـ nav نفسه مفلتر حسب الدور ومقفل حسب الخطة، وSuper Admin يستبدل clinic navigation بالكامل.

## 5. namespaces وبادئات i18n

يوجد قاموسان للإنجليزية والعربية: [en.ts](src/lib/i18n/dictionaries/en.ts) فيه 1,765 مفتاحًا، و[ar.ts](src/lib/i18n/dictionaries/ar.ts) فيه 1,768 مفتاحًا. واللغات المعرفة صراحة هي `en` و`ar` في [locale.ts](src/lib/i18n/locale.ts).

البادئات المكتشفة وربطها بالكود:

- `common`, `pagination`, `nav`, `header`, `shell`, `perm`: shell والتنقل والعناصر المشتركة والصلاحيات.
- `auth`, `signup`, `forgot`, `reset`, `verify`, `suspended`, `portal`: الدخول والبوابة.
- `patients`, `addPatient`, `profile`, `allergy`, `bloodType`, `gender`, `emergencyName`, `emergencyPhone`, `primaryCare`, `firstName`, `lastName`, `email`, `phone`, `secondaryPhone`, `street`, `city`, `state`, `zip`: نماذج وملف المريض.
- `appt`, `appts`, `apptType`, `book`, `recurr`, `availability`, `calendar`, `queue`, `waitlist`, `wl`, `tele`, `locations`: الجدولة والحجز والانتظار والمواقع.
- `enc`, `doctor`, `ai`, `tp`, `trend`, `vitals`, `rx`, `print`, `lab`, `labs`, `inv`, `doc`, `consent`, `consentType`: clinical workspace والوصفات والمختبر والمستندات.
- `billing`, `pay`, `inst`, `exp`, `pkg`, `plan`, `plans`, `upg`: الفوترة والدفع والباقات والاشتراكات.
- `comm`, `camp`, `automation`, `reports`, `audit`, `analytics`: التواصل والحملات والأتمتة والتقارير والتدقيق والتحليلات.
- `settings`, `staff`, `security`, `super`, `clinic`, `featureTip`, `tip`, `lang`, `landing`, `dash`, `help`: النظام والإدارة والصفحة العامة والمساعدة.

توجد أيضًا مفاتيح غير مسبوقة مثل labels/placeholders. اختلاف عدد المفاتيح لا يثبت عدم التكافؤ؛ يوجد اختبار `tests/unit/i18n-parity.test.ts` للفحص المقصود.

## 6. كود غير مكتمل أو mock أو feature flags

| الملف | الملاحظة | التصنيف | الأثر |
|---|---|---|---|
| [en.ts](src/lib/i18n/dictionaries/en.ts) | `portal_comingSoon: "Coming soon"` | UI غير مكتمل صراحة | توجد مساحة معلنة كقادم قريب. |
| [app-preview.tsx](src/components/landing/app-preview.tsx) | تعليقات Mock للـ topbar/sidebar/main/chart/list | mock تسويقي مقصود | المعاينة توضيحية وليست بيانات dashboard حية. |
| [clinic-showcase.tsx](src/components/landing/clinic-showcase.tsx) | Mock activity sparkline | mock تسويقي | الرسم ثابت/توضيحي. |
| [stripe.ts](src/lib/stripe.ts) | `sk_test_dummy` عند غياب secret | fallback تطويري | العمليات الحقيقية تحتاج env. |
| [prisma.ts](src/lib/prisma.ts) | dummy proxy عند تخطي DB أثناء build | fallback للـ build | لا يمثل توافر البيانات وقت التشغيل. |
| [boot-env.ts](src/lib/boot-env.ts) | رفض secrets placeholder في production | config gate | التشغيل يرفض secrets غير الصالحة. |
| [ai.ts](src/lib/ai.ts) | provider `none` افتراضيًا أو غياب `AI_API_KEY` | feature/config gate | AI summary/scribe غير متاح حتى الإعداد. |
| [FHIR route](src/app/api/integrations/fhir/[...path]/route.ts) | غياب `FHIR_BASE_URL` يعيد integration-not-configured | feature/config gate | FHIR مغلق بدون upstream. |
| [cloudinary.ts](src/lib/cloudinary.ts) | غياب credentials يسبب configuration error | feature/config gate | الرفع يحتاج credentials الثلاثة. |
| [communications.ts](src/lib/communications.ts) | غياب Twilio يعيد `Twilio not configured`، والبريد لديه fallback test credentials | provider fallback | السلوك يعتمد على env. |
| مسارات scheduled reminders | production cron يحتاج `CRON_SECRET` | security/config gate | لا يمكن تفعيل الرسائل المجدولة بأمان بدونه. |
| `src/components/landing/*` | قيم عرض ثابتة وأزرار demo login | بيانات عرض مقصودة | ليست دليلًا على mock داخل dashboard. |

لم يظهر TODO/FIXME عام يثبت نقص runtime implementation. العلامات المهمة هي `coming soon` وmock وfallback وconfiguration gates المذكورة أعلاه.

## 7. موديلات وroutes محتمل أنها ميتة أو غير مباشرة

### موديلات بلا reference مباشر داخل route handler
`RolePermission`, `PatientSession`, `EmergencyContact`, `AppointmentEquipment`, `PrescriptionItem`, `Installment`, `PricingTier`, `InventoryTransaction`, `FeedbackSurvey`, `WebhookDelivery`.

هذا لا يثبت dead code؛ قد تكون nested writes أو auth internals أو join models أو seed/catalog models أو records تديرها helpers.

### Routes تحتاج تأكيدًا يدويًا
- `/api/lab-orders/{id}/transmit` و`ingest` تصدران POST كـ alias (`export const POST = ...`) بدل function declaration؛ هي منفذة لكن scanners البسيطة قد لا تراها.
- `/api/auth/[...nextauth]` مفوض إلى NextAuth ولا يحتوي CRUD methods محلية.
- `/api/patient-auth/me` و`logout` يعتمدان على helpers للجلسات؛ لا يظهر كل استخدام Prisma داخل route نفسه.
- `/api/health` liveness فقط، و`/api/ready` يفحص PostgreSQL.
- `/api/documents/templates` read-only ويعيد template definitions من helper بدل موديل Prisma.

## 8. الملخص العام

- **عدد موديلات schema:** 69.
- **عدد ملفات API routes:** 167 تحت `src/app/api`.
- **صفحات dashboard:** 34؛ وإجمالي ملفات `page.tsx` تحت `src/app`: 47.
- **اللغات:** English وArabic؛ 1,765 مفتاحًا إنجليزيًا و1,768 عربيًا.
- **migrations:** 46؛ يوجد اثنان بتاريخ بعد تاريخ الفحص ويحتاجان تأكيد حالة التطبيق.
- **أكبر الدومينات من حيث سطح التنفيذ:**
  1. Clinical/EMR: encounters وnotes وvitals وprescriptions وlabs وprocedures وtreatment plans وAI.
  2. Patient/portal: profiles وhistory وallergies وconsent وinsurance وdocuments وfeedback وintake.
  3. Scheduling/operations: appointments وbooking وqueue وwaitlist وbranches وrooms وshifts وavailability.
  4. Billing/RCM: invoices وpayments وrefunds وStripe وinstallments وcoupons وpackages وinsurance وexpenses.
  5. Platform/SaaS: tenancy وauth وRBAC وplans وentitlements وaudit وAPI keys وwebhooks وsuper console.
- **أقل الدومينات وضوحًا من الكود فقط:** insurance claims/policies بلا dashboard page مقابلة، وequipment allocation/maintenance بلا nav، والفرق بين `FeedbackSurvey` و`Feedback`، وlab/FHIR exchange العام الذي يعتمد على env ولا يرتبط بمزود محدد.
- **أقوى دلائل التنفيذ:** tenant-aware routes، وZod validation في معظم mutations، وaudit في معظم الكتابات، وnavigation مقيد بالدور والخطة، وmigrations حقيقية، واختبارات unit/integration/E2E، وحالات فشل واضحة للتكاملات.
- **نقاط التأكيد الرئيسية:** قيم deployment env، تطبيق migrations المستقبلية، قصدية الموديلات nested بلا API، قبول Nodemailer fallback خارج التطوير، والحاجة إلى صفحات مستقلة للتأمين والمعدات وتبادل المختبر.

## Appendix A — فهرس API الكامل

يوجد 167 ملف `route.ts` فعليًا. فيما يلي المسارات كاملة؛ أسماء المسارات والـ methods أبقيت كما هي لأنها identifiers تنفيذية:

```text
/api/ai/scribe POST
/api/ai/summary POST
/api/analytics/dashboard GET
/api/api-keys GET, POST
/api/api-keys/{id}/revoke POST
/api/appointments GET, POST, PATCH
/api/appointments/{id}/check-in POST, OPTIONS
/api/appointments/{id}/check-out POST, OPTIONS
/api/appointments/{id}/no-show POST, OPTIONS
/api/appointments/{id}/recurrence POST
/api/appointments/{id}/telehealth PATCH
/api/audit GET
/api/auth/[...nextauth] delegated NextAuth handler
/api/auth/2fa/disable POST
/api/auth/2fa/setup POST
/api/auth/2fa/status GET
/api/auth/2fa/verify POST
/api/auth/forgot-password POST
/api/auth/resend-verification POST
/api/auth/reset-password POST
/api/auth/verify-email POST
/api/automation/signals GET
/api/billing/invoices GET, POST
/api/book/{orgSlug}/appointments POST
/api/book/{orgSlug}/availability GET
/api/branches GET, POST
/api/branches/{id} PATCH
/api/catalogs GET, POST
/api/clinical-orders GET, POST
/api/clinical-templates GET, POST
/api/clinical-templates/{id} PATCH, DELETE
/api/communications GET, POST
/api/communications/appointment-reminders GET, POST
/api/communications/campaigns GET, POST
/api/communications/campaigns/{id}/launch POST
/api/communications/scheduled GET, POST
/api/consents GET, POST
/api/consents/{id} PATCH
/api/coupons GET, POST
/api/coupons/{id} PATCH
/api/cron/follow-up-escalation POST
/api/documents GET, POST
/api/documents/{id}/download GET
/api/documents/{id}/token GET
/api/documents/generate POST
/api/documents/templates GET
/api/encounters GET, POST
/api/encounters/{id} PATCH
/api/encounters/{id}/notes POST
/api/equipment GET, POST
/api/equipment/{id}/maintenance GET, POST
/api/expenses GET, POST
/api/expenses/{id} DELETE
/api/feedback GET
/api/feedback/request POST
/api/health GET
/api/insurance/claims GET, POST
/api/insurance/claims/{id} PATCH
/api/insurance/policies GET, POST
/api/insurance/policies/{id}/eligibility GET
/api/installment-plans GET, POST
/api/installment-plans/{id} PATCH
/api/installment-plans/{id}/pay POST
/api/integrations/fhir/{...path} GET, POST
/api/intake-forms GET, POST
/api/intake-forms/{id} PATCH, DELETE
/api/intake-forms/{id}/fields POST
/api/intake-responses GET
/api/inventory GET, POST
/api/inventory/{id} PATCH
/api/inventory/{id}/transaction POST
/api/inventory/alerts GET, POST
/api/lab-orders GET, POST
/api/lab-orders/{id} PATCH
/api/lab-orders/{id}/ingest POST (alias export)
/api/lab-orders/{id}/transmit POST (alias export)
/api/lab-orders/{id}/{verb} POST
/api/labs GET, POST
/api/notifications GET, POST
/api/notifications/{id} PATCH
/api/notifications/push POST, DELETE
/api/org/export GET
/api/org/request-upgrade POST
/api/packages GET, POST
/api/patient-auth/login POST
/api/patient-auth/logout POST
/api/patient-auth/me GET
/api/patient-packages GET, POST
/api/patient-packages/{id} PATCH, DELETE
/api/patient-packages/{id}/consume POST
/api/patient-portal/appointments/{id}/cancel POST
/api/patient-portal/appointments/{id}/reschedule PATCH
/api/patient-portal/consents GET, POST
/api/patient-portal/documents GET
/api/patient-portal/feedback GET, POST
/api/patient-portal/feedback/rateable GET
/api/patient-portal/intake GET, POST
/api/patient-portal/intake/forms GET
/api/patient-portal/invoices GET
/api/patient-portal/overview GET
/api/patient-portal/payments POST
/api/patients GET, POST
/api/patients/{id} GET, PATCH
/api/patients/{id}/allergies GET, POST
/api/patients/{id}/allergies/{allergyId} PATCH, DELETE
/api/patients/{id}/archive POST
/api/patients/{id}/attendance GET
/api/patients/{id}/history GET, POST
/api/patients/{id}/merge POST
/api/patients/{id}/summary GET
/api/payments GET, POST
/api/payments/{id}/refund POST
/api/plan/entitlements GET
/api/prescriptions GET, POST
/api/prescriptions/{id} PATCH, DELETE
/api/prescriptions/{id}/send POST
/api/prescriptions/favorites GET
/api/prescription-templates GET, POST
/api/prescription-templates/{id} PATCH, DELETE
/api/prescription-templates/{id}/use POST
/api/procedure-orders GET, POST
/api/procedure-orders/{id} PATCH
/api/profile/availability PATCH
/api/profile/avatar GET, PATCH
/api/queue GET
/api/queue/actions POST
/api/ready GET
/api/reports/monthly GET
/api/reports/scheduled POST
/api/reports/schedules GET, POST
/api/reports/schedules/{id} DELETE
/api/rooms GET, POST
/api/rooms/{id} PATCH
/api/settings GET, PATCH
/api/shifts GET, POST
/api/shifts/{id} DELETE
/api/signup POST
/api/staff GET, PATCH
/api/staff/roles GET, POST
/api/super/approvals GET
/api/super/audit GET
/api/super/orgs GET
/api/super/orgs/{orgId}/detail GET
/api/super/orgs/{orgId}/override GET, POST
/api/super/orgs/{orgId}/override/{overrideId} DELETE
/api/super/orgs/{orgId}/plan POST
/api/super/orgs/{orgId}/status POST
/api/super/orgs/{orgId}/upgrade POST
/api/super/plans GET, POST
/api/super/plans/{id} GET, PATCH, DELETE
/api/super/plans/{id}/duplicate POST
/api/super/settings GET, PUT
/api/tasks GET, POST
/api/tasks/{id} GET, PUT
/api/treatment-plans GET, POST
/api/treatment-plans/{id} GET, POST
/api/treatment-plans/{id}/steps POST, PATCH
/api/uploads POST
/api/vitals GET, POST
/api/vitals/stream GET
/api/vitals/trend GET
/api/waitlist GET, POST
/api/waitlist/{id} PATCH
/api/waitlist/{id}/book POST
/api/webhooks GET, POST
/api/webhooks/{id} PATCH, DELETE
/api/webhooks/stripe POST
```
