# TEST_REPORT.md — Full Patient Journey E2E (live, all 8 roles)

> تاريخ التنفيذ: 2026-09-14 — البيئة: dev محلي (`http://localhost:3000`) ضد Neon dev
> السكربت: `scripts/e2e-qa-journey.js` (بيانات scratch ببادئة `E2EQATEST`، محذوفة بعد التشغيل)
> النتيجة: **32/32 ناجحة** — بدون أي ❌ بعد الإصلاحات. التشغيل الأول كشف مشكلة واحدة (تاريخ الحجز × فلتر الطابور اليومي) وأُصلحت في السكربت ثم أُعيد التشغيل بنجاح كامل (Regression).

## ملخص الرحلة المنفذة حيًا (IDs حقيقية من التشغيل الناجح)

`تسجيل مريض → حجز (Dr admin@acmeclinic.com) → Check-in → Queue → Vitals (BMI=24.2 تلقائي) → Encounter مربوط بالموعد → call-next يعيد نفس الـ Encounter → بحث دواء (2 نتائج) → 5 قوالب → روشتة مربوطة بالزيارة → إغلاق ولّد `INV-...` بمبلغ 300 (رسوم الاستشارة الحقيقية) → طبيب مُنع من الفوترة (403) → صرف خصم 300→298 وأكمل الروشتة → فاتورة `sent` → دفع نقدي → `paid 300/300` → البوابة (روشتة+زيارة+فاتورة) → تقرير المالك الشهري → سوبر (orgs) → عزل: طبيب عيادة B يرى مريض عيادة A = 404.`

## النتائج بالصيغة المتفق عليها

| # | الرول → الخطوة → الحالة → الوصف والحل |
|---|----------------------------------------|
| 1 | [Seed] → [تجهيز IDs: عيادة/دكتور/دواء] → ✅ → `alexandria-medical-center` + `admin@acmeclinic.com` + بانادول مخزون 300. |
| 2 | [Reception] → [دخول] → ✅ → `receptionist@acmeclinic.com` عبر next-auth credentials حيًا. |
| 3 | [Reception] → [تسجيل مريض] → ✅ → `POST /api/patients` (الاسم الأول/الأخير فقط إلزامي) — `src/app/api/patients/route.ts`. |
| 4 | [Reception] → [حجز موعد] → ✅ → `POST /api/appointments` بفحص التوفر والتعارض — `src/lib/appointments.ts:89`. |
| 5 | [Reception] → [Check-in] → ✅ → `scheduled→arrived` عبر `src/lib/reception.ts:32` (`src/app/api/appointments/[id]/check-in/route.ts`). |
| 6 | [Reception] → [الطابور يعرض المريض H1] → ✅ → `GET /api/queue` (يقرأ `arrived,in_progress` اليومية) — بعد إصلاح تصميم الاختبار: الطابور يومي، والحجز كان للغد في التشغيل الأول (⚠️ موثقة أدناه) — `src/app/api/queue/route.ts:21`. |
| 7 | [Nurse] → [دخول] → ✅ → `nurse@acmeclinic.com` حيًا. |
| 8 | [Nurse] → [تسجيل Vitals + BMI تلقائي] → ✅ → `POST /api/vitals` (BMI=24.2 حُسب من 70kg/170cm) — `src/app/api/vitals/route.ts:97`. |
| 9 | [Doctor] → [دخول] → ✅ → `admin@acmeclinic.com` حيًا. |
| 10 | [Doctor] → [يرى Vitals الممرضة H2/G4] → ✅ → `GET /api/vitals?patientId` أعاد القراءة (نفس مصدر `EncounterVitalsCard`) — `src/components/encounters/encounter-vitals-card.tsx`. |
| 11 | [Doctor] → [بدء Encounter مربوط G3] → ✅ → `POST /api/encounters {patientId, appointmentId}` — `src/app/api/encounters/route.ts:70`. |
| 12 | [Reception] → [call-next يعيد نفس الـ Encounter] → ✅ → idempotent عبر `appointmentId@unique` — `src/app/api/queue/actions/route.ts:105`. |
| 13 | [Doctor] → [بحث قاعدة الأدوية G1] → ✅ → `GET /api/medications/search` أعاد نتيجتين — `src/app/api/medications/search/route.ts`. |
| 14 | [Doctor] → [القوالب موجودة G2] → ✅ → 5 قوالب مشتركة من `scripts/seed-medications.js`. |
| 15 | [Doctor] → [كتابة روشتة مربوطة بالزيارة] → ✅ → `POST /api/prescriptions {patientId, encounterId}` + فحص حساسية استشاري — `src/app/api/prescriptions/route.ts:86`. |
| 16 | [Doctor] → [إغلاق يولّد فاتورة G7] → ✅ → `INV-… total=300.00` (رسوم استشارة الدكتور الحقيقية) في نفس الترانزكشن — `src/lib/auto-invoice.ts`. |
| 17 | [Doctor] → [الفوترة محظورة على الدكتور] → ✅ → `GET /api/billing/invoices` رد **403** كما يجب (RBAC سيرفر فعلي). |
| 18 | [Pharmacist] → [دخول] → ✅ → `pharmacist@acmeclinic.com` حيًا. |
| 19 | [Pharmacist] → [صرف يخصم المخزون ويكمل الروشتة G5/G8] → ✅ → `completed + sentToPharmacy=true` والمخزون 300→298 في ترانزكشن واحدة — `src/app/api/prescriptions/[id]/dispense/route.ts`. |
| 20 | [Biller] → [دخول] → ✅ → `billing@acmeclinic.com` حيًا. |
| 21 | [Biller] → [يرى الفاتورة التلقائية] → ✅ → `status=sent` في `GET /api/billing/invoices?patientId`. |
| 22 | [Biller] → [تحصيل نقدي] → ✅ → `POST /api/payments {cash}` قبل فورًا (`completed`) — `src/lib/payments.ts:34`. |
| 23 | [Biller] → [الحالة بعد الدفع] → ✅ → `paid 300/300` عبر `resolveInvoiceStatus`. |
| 24 | [Patient Portal] → [دخول] → ✅ → `POST /api/patient-auth/login` (email+mrn+patient123) — `src/app/api/patient-auth/login/route.ts`. |
| 25 | [Patient Portal] → [يرى الروشتة G10] → ✅ → `GET /api/patient-portal/prescriptions` — `src/app/api/patient-portal/prescriptions/route.ts`. |
| 26 | [Patient Portal] → [يرى سجل الزيارات G10] → ✅ → `GET /api/patient-portal/visits` (الزيارة المغلقة + التشخيصات/المتابعات). |
| 27 | [Patient Portal] → [يرى الفاتورة] → ✅ → `GET /api/patient-portal/invoices` (مملوكة له فقط `patientId=session`). |
| 28 | [Owner] → [دخول] → ✅ → `owner@acmeclinic.com` حيًا. |
| 29 | [Owner] → [التقرير الشهري H6] → ✅ → `GET /api/reports/monthly?month=` (perDoctor/perService) — `src/app/api/reports/monthly/route.ts`. |
| 30 | [Super Admin] → [دخول] → ✅ → `superadmin@acmeclinic.com` (فحص مزدوج) — `src/lib/roles.ts:89`. |
| 31 | [Super Admin] → [عيادات المنصة بلا بيانات تشغيلية] → ✅ → `GET /api/super/orgs` 200 (كيانات فقط). |
| 32 | [Super Admin] → [عزل Tenants: عيادة B لا ترى مريض عيادة A] → ✅ → طبيب `demo-alexandria-family-clinic` طلب `GET /api/patients/<id-A>` فرد **404** (فحص `id+organizationId`) — `src/app/api/patients/[id]/route.ts`. |

## مشكلات ظهرت أثناء التنفيذ (وحُلّت)

| المشكلة | التشخيص | الحل |
|---------|---------|------|
| ⚠️ التشغيل الأول: `queue shows patient` فشل (`[]`) رغم نجاح Check-in | ليست كسرًا في التطبيق: `GET /api/queue` يفلتر **مواعيد اليوم فقط** (`startTime gte اليوم 00:00`) بينما السكربت حجز **غدًا 10:00**. الـ Check-in نفسه لا يقيّد التاريخ. | أُصلح تصميم الاختبار (الحجز اليوم +30 دقيقة داخل نافذة الدكتور 10:00–22:00) وأُعيد التشغيل: 32/32. **توصية لاحقة:** منع Check-in لموعد غير اليوم (409) حتى لا يعلق موعد الغد في `arrived` خارج الطابور — تُركت كتحسين مستقبلي لأن السلوك الحالي متسق (الحالة صحيحة، والظهور يوم الموعد). |
| ✅ اكتشاف أمني إيجابي: حذف `AuditLog` مستحيل | التريجر `audit_log_append_only` (DELETE/UPDATE → `prevent_audit_log_mutation()`) منع تنظيف صفوف التدقيق التجريبية — تحقق مباشر `information_schema.triggers`. | اعتُبر سلوكًا صحيحًا (append-only حقيقي على مستوى DB وليس ادعاءً) — التنظيف يتجاوز التدقيق، وبقي صفّان تجريبيان موسومان (`E2EQATEST`) عمدًا. وُثّق هنا بدل الحذف. |

## حالة التنظيف (موثقة بالأرقام)

- مرضى scratch المتبقون: **0** — المخزون أُعيد **298→300** (حذف حركات الصرف التجريبية) — الفواتير/المدفوعات/الروشتات/الزيارات/المواعيد التجريبية: **محذوفة** — بقايا التدقيق: **صفّان** (append-only مقصود).

## Regression

- بعد كل Gap: `vitest` للموديولات المتأثرة (أخضر) + `tsc --noEmit` خالٍ من أي خطأ في الملفات الجديدة (الأخطاء الباقية pre-existing: Prisma models قديمة في ملفات لم نمسّها) + `eslint` نظيف.
- التشغيل الثاني الكامل بعد إصلاح تصميم الاختبار: **32/32** — لا كسر متقاطع بين الأدوار.
