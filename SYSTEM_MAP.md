# SYSTEM_MAP.md — المرحلة 1: Full System Audit + Cross-Role Handoffs

> تاريخ التدقيق: 2026-09-14 — الفرع: `main` @ `3092cfe`
> النطاق: كل الـ Routes/Endpoints + Prisma Models + الصلاحيات + شاشات الـ 8 أدوار
> القاعدة: لا تعتبر Feature مكتملة إلا إذا كانت مربوطة بما قبلها وبعدها. هذا الملف هو البوابة — لا ننتقل للمرحلة 2 قبل مراجعته معك.

Stack: Next.js 16 (App Router) + React 19 + Prisma + Postgres (Neon) + next-auth v4 JWT Credentials.
Tenant = `Organization` (الفروع الفيزيائية = `Branch`). كل كويري عيادة يجب أن تُفلتر بـ `organizationId`.

---

## 1) خريطة كل Role (8 أدوار)

### 1. مالك (Owner) — `User.role=owner` + RBAC `Owner`
**الشاشات المتاحة فعليًا (Sidebar `canAccess` = كل شيء):**
`/dashboard, /patients (+[id], +[id]/summary), /appointments, /queue, /encounters, /analytics, /consents, /audit, /prescriptions, /billing, /payments, /insurance, /labs, /inventory, /equipment, /tasks, /documents, /communications, /campaigns, /automation, /plan, /reports, /availability, /locations, /catalogs, /settings, /integrations, /waitlist, /security, /staff, /roles-guide, /help, /print/*`
**Modules (ROLE_MODULE_ACCESS):** كل الـ 25 (`dashboard,patients,appointments,queue,encounters,analytics,consents,audit,labs,tasks,documents,reports,availability,catalogs,communications,locations,waitlist,billing,payments,inventory,automation,campaigns,settings,plan,help`).
**CRUD:**
- كل شيء: مرضى/مواعيد/زيارات/روشتات/فواتير/مدفوعات/مخزون/تقارير/فروع/غرف/ورديات/كتالوجات/intake-forms/webhooks/api-keys (`requireOwner`).
- `/plan` محمي سيرفر فعليًا (`(dashboard)/plan/page.tsx` → `requireOwner`)، `/roles-guide` → `isOwner()`.
**معزول / بلا ارتباط:**
- `/automation`, `/campaigns` ظاهران له لكنهما Owner-only في الـ proxy — يعملان له فقط، بينما يظهران مكسورين للأدوار الأخرى (انظر G12).
- `/settings, /staff, /integrations` بلا page-guard سيرفر (client-only + proxy-bypass) — تُفتح بالـ URL لأي رول (الحماية فقط على مستوى API) — G13.
**Seed ناقص:** لا يؤثر عليه مباشرة، لكن تقاريره ستكون فارغة بدون بيانات عيادة ثانية للمقارنة.

### 2. طبيب (Doctor) — `doctor` + RBAC `Doctor`
**الشاشات:** `/dashboard, /patients, /appointments, /queue, /encounters, /analytics, /consents, /audit, /prescriptions, /labs, /tasks, /documents, /automation, /reports, /availability, /catalogs, /security, /help` (18).
**محجوب عنه:** `/billing, /payments, /insurance, /inventory, /equipment, /communications, /campaigns, /locations, /waitlist, /plan, /settings, /integrations, /staff, /roles-guide`.
**CRUD (API):**
- يقرأ/يكتب: patients, appointments, encounters (زيارات + notes + clinical-orders + treatment-plans + procedure-orders), vitals, prescriptions (+favorites +templates), labs/lab-orders, documents, consents, tasks, reports/monthly.
- ممنوع: billing/payments/inventory (API ترد 403 عبر `requireModulePermission`).
**معزول / بلا مدخل:**
- `POST /api/prescriptions` موجود ويعمل، لكن **بلا Medication DB** — الإدخال نص حر `medicationName` (`new-prescription-dialog.tsx:384-403`). لا يوجد select من مخزون/كتالوج.
- `GET /api/prescription-templates` + `favorites` موجودان لكن **صفر صفوف في الـ Seed** — الـ Empty States موجودة (`rx_templates_empty`) لكن لا CTA يوجه من أين تُنشأ القوالب.
- `encounters-workspace.tsx` فيه زر `NewPrescriptionDialog(defaultEncounterId)` — مربوط، لكن **لا يعرض Vitals** إطلاقًا (grep `vital` = صفر) — G4.
- `/automation` يظهر له في Sidebar لكن `proxy.ts` يطرده لـ `/dashboard` (Owner-only) — رابط ميت — G12.
**Seed ناقص:** صفر `PrescriptionTemplate`، صفر `MedicationFavorite`، صفر `ClinicalTemplate`، لا كتالوج أدوية (انظر قسم 3).

### 3. استقبال (Reception) — DB `Care Coordinator` / ظاهريًا `Receptionist` (`role-labels.ts`)
**الشاشات:** `/dashboard, /patients, /appointments, /queue, /consents, /tasks, /documents, /communications, /campaigns, /locations, /waitlist, /security, /help` (13).
**محجوب:** كل السريري والمالي (`/encounters, /prescriptions, /billing, /labs, /inventory...`).
**CRUD:**
- patients (بحث/تسجيل/دمج/أرشفة)، appointments (حجز/تعديل/إلغاء + `check-in/check-out/no-show` عبر `handleReceptionAction` في `lib/reception.ts:32-94`)، queue/actions (`call-next/complete/no-show`)، waitlist (+`[id]/book` يحجز موعد في `$transaction` واحدة)، communications/campaigns، documents.
**معزول / بلا ارتباط:**
- `POST /api/appointments/[id]/check-in|check-out|no-show` يعمل ويدخل المريض `queue` تلقائيًا (`queue/route.ts:21-32` يقرأ `status IN [arrived,in_progress]`) — **هذا الجزء سليم**.
- لكن `complete/check-out` يضع `completed` **ولا ينشئ Encounter** — بدء الزيارة يدوي من `encounters-workspace.tsx:74-85` باختيار مريض بدون `appointmentId` — G3.
- `/campaigns` يظهر له لكن الـ proxy يطرده (Owner-only) — رابط ميت — G12.
- Empty States بلا توجيه: `queue_empty: "The queue is empty."` (`queue/page.tsx:147`)، `wl_empty`، `reception_noAppointments` — كلها نص static بلا CTA — G14.
**Seed ناقص:** 6 مرضى curated + 14 مولدين — كافٍ للتجربة، لكن لا سيناريو "مريض بوابة" موثق.

### 4. تمريض (Nurse) — `nurse` + RBAC `Nurse`
**الشاشات:** `/dashboard, /patients, /appointments, /queue*, /encounters, /analytics, /consents, /prescriptions, /labs, /inventory, /equipment, /tasks, /documents, /automation, /reports, /availability, /catalogs, /security, /help`.
`*` `/queue` ظاهر لها في Sidebar لكن **غائب من `ROLE_MODULE_ACCESS.Nurse`** — تناقض — G12.
**CRUD:**
- تقرأ/تكتب: patients, encounters, vitals (`POST /api/vitals` — `encounters:write|patients:write` + BMI تلقائي `lib/vitals.ts:48-55`)، labs, inventory/equipment، documents، tasks.
- ممنوعة: billing/payments.
**معزول / بلا ارتباط:**
- **لا يوجد مكون إدخال Vitals مخصص للممرضة** — الإدخال خام عبر `POST /api/vitals` فقط. لا زر في `queue` أو `encounters` يقول "سجّل الحيوية".
- **Vitals لا تظهر للدكتور في مساحة الكشف**: `encounters-workspace.tsx` صفر `vital`، والدكتور مضطر يخرج لـ `/patients/[id]` → `<VitalsTrendCard>` أو `/patients/[id]/summary` — G4 (أخطر كسر Handoff).
- الـ Live stream (`/api/vitals/stream` SSE + `hooks/use-vitals-stream.ts`) **مستخدم فقط في `patient-portal/page.tsx:33,71` — صفر استخدام في شاشات الطاقم**.
- صلاحية "تنفيذ حقن/تطعيمات": **غير موجودة كفلو مستقل** — تُسجّل فقط كـ `procedure-orders` عامة (`ordered|collected|resulted`) بدون تمييز تمريضي — يحتاج قرار استبعاد/تصميم — G6.
**Seed ناقص:** ~14 encounter فيها vitals — كافية للقراءة، لكن لا فلو "ممرضة تستلم من Queue" موثق.

### 5. محاسبة (Biller) — `biller` + RBAC `Biller`
**الشاشات:** `/dashboard, /patients, /appointments, /analytics, /audit, /billing, /payments, /insurance, /tasks, /reports, /security, /help` (12).
**CRUD:**
- invoices (`POST` يدوي سطر واحد `new-invoice-dialog.tsx:86-103` + lookup كتالوج + كوبون)، payments (`POST /api/payments` — نقدي/تحويل/شيك/تأمين → `completed` فورًا + `resolveInvoiceStatus` في `lib/payments.ts:34-38` → `paid/partially_paid/sent`؛ غيرها Stripe → `pending`)، refunds، insurance policies/claims، coupons، installment-plans (+`[id]/pay`)، expenses، reports/monthly.
- حالات الفاتورة موجودة فعلًا: `draft|sent|partially_paid|paid|overdue` (`schema.prisma` → `Invoice.status`).
**معزول / بلا ارتباط:**
- **لا توليد تلقائي عند إغلاق الزيارة.** `PATCH /api/encounters/[id]` (إغلاق) + `queue/actions complete` + `check-out` — الثلاثة لا تنشئ فاتورة (grep `encounter.*invoice` = صفر إلا placeholder `svc_effect_charge_policy`). الاستثناء الوحيد: إيداع الحجز الذاتي (`book/[orgSlug]/appointments/route.ts:108-132`) — G7.
- `new-invoice-dialog` سطر واحد يدوي — لا يجمع (كشف + أدوية مصروفة + إجراءات) تلقائيًا.
- `pay_empty: "No payments found"` بلا CTA؛ `billing_empty` فيه CTA — جزئي — G14.
**Seed ناقص:** 3 فواتير curated + 16 bulk + lineItems + payments — كافٍ للعرض، لكن لا فاتورة مربوطة بـ encounter/روشتة محددة end-to-end.

### 6. صيدلي (Pharmacist) — `pharmacist` + RBAC `Pharmacist`
**الشاشات:** `/dashboard, /patients, /appointments, /prescriptions, /labs, /inventory, /equipment, /tasks, /catalogs, /security, /help` (11).
**محجوب:** `/queue, /encounters, /billing, /payments, /insurance` — **وهذا نفسه كسر**: الصيدلي يصرف لكن لا يرى الفاتورة ولا حالة الدفع.
**CRUD:**
- يقرأ `GET /api/prescriptions` (يرى `sentToPharmacy` badge + طباعة `print/prescription/[id]`)، يغير `PATCH {status}` (`active|completed|cancelled`)، يقرأ/يكتب inventory (`POST /transaction {restock|usage}`).
**معزول / بلا ارتباط (كسر كامل):**
- زر **Dispense غير موجود**: `prescriptions/page.tsx:110-126` يرسل `{status}` فقط — **لا يضبط `sentToPharmacy` أبدًا** رغم أن الحقل موجود في API (`prescriptions/[id]/route.ts:13,18,56`). قناة `POST /prescriptions/[id]/send` (sms/email/whatsapp → `Communication`) موجودة لكن **غير موصولة بزر في القائمة**.
- **الصرف لا يخصم من المخزون إطلاقًا** (grep `dispense|inventory.*prescription` = صفر عبر الواجهتين). `inventory/[id]/transaction` يدوي بـ `reason` حر.
- المخزون نفسه بلا `expiry batch` فعلي (الموديل `InventoryItem.expiryDate/batchNumber` مفرد، و`inventory_expiry_batch` مذكور في المايجريشن لكن لا فلو FEFO)، وبلا تنبيه حد أدنى في الواجهة (API `inventory/alerts` موجود لكن لا زر صرف يستدعيه) — G8.
**Seed ناقص:** 15 صنف مخزون (7 أساسي + 8 bulk) بأسماء تجارية فقط — **لا قاعدة أدوية (علمي/تجاري/جرعة/شكل)** ولا 50-100 دواء — G9.

### 7. حساب بوابة المريض (Patient Portal) — auth منفصل (`Patient.passwordHash` + `PatientSession`، لا RBAC)
**الشاشة الوحيدة:** `src/app/patient-portal/page.tsx` (client-only). الأقسام: حجز (`/book/[orgSlug]` عبر `book-clinic-client.tsx`)، معلومات الحساب، Vitals حية (`useVitalsStream`)، مواعيد قادمة (إلغاء/إعادة جدولة/telehealth)، Rateable Visits، تحاليل (آخر 3)، مستندات، فواتير (دفع Stripe redirect عبر `POST /patient-portal/payments → {url}`)، موافقات (accept/decline)، `PortalIntakeCard`.
**CRUD:** حجز/إلغاء/إعادة جدولة مواعيده فقط (يفحص `patient.organizationId == org.id` وإلا 403)، دفع فواتيره، تعبئة intake، قبول consents، تقييم زيارات.
**معزول / بلا ارتباط (3 كسور موثقة):**
- **الروشتة غير مرئية للمريض إطلاقًا**: لا `api/patient-portal/*prescription*` ولا كلمة `prescription` في `patient-portal/page.tsx` (grep = صفر) — G10.
- بعد الحجز **لا Confirmation page/ticket** — فقط `toast portal_bookSuccess` + reload slots (`book/[orgSlug]/appointments/route.ts`) — G11.
- 3 أزرار ميتة `disabled + portal_comingSoon`: `View Medical Records / Message Provider / View Health Summary` (`patient-portal/page.tsx:355-394`) — G11.
- لا تذكير قبل الميعاد في البوابة (التذكير عبر `communications/appointment-reminders` للطاقم فقط).
- Empty States كلها static (`portal_noUpcomingAppointments, portal_noLabResults, portal_noDocuments, portal_noInvoices, portal_noVitals, portal_noSlots`) — لا بديل "انضم للانتظار" — G14.
**Seed ناقص:** 20 مريضًا (`patient123`) — كافٍ، لكن لا توثيق أي حساب بوابة مربوط بسيناريو كامل.

### 8. سوبر أدمن (Super Admin) — `superAdmin` + RBAC `Super Admin` (فحص مزدوج)
**الشاشات فقط:** `/super?section=organizations,approvals,billing,audit,services,settings` (`super-console.tsx`) + `/super/plans` + `/super/clinics/[orgId]` + استثناء `/roles-guide`. عند `isSuperAdmin` يُصفَّر تنقل العيادة بالكامل ويُجبر على `/super` عبر `proxy.ts`.
**CRUD:** تفعيل/تعطيل عيادة (`super/orgs/[orgId]/status`)، خطط (`plans`, `[id]/duplicate`)، اشتراك/ترقية (`[orgId]/plan|upgrade|override`)، إعدادات منصة، تدقيق (`super/audit`)، موافقات. كلها `requireSuperAdmin()` (فحص مزدوج: `roles includes Super Admin` + `user.role==superAdmin && active` في `lib/roles.ts:89-110`) — لا يستطيع Tenant ترقية نفسه.
**عزل:** قوي — كل routes العيادات `getOrgId()+assertOrgScope+where:{organizationId}`، والـ super تستثني `slug:platform-admin` وترفض تعديلها. الـ raw SQL في `reports/monthly` يستخدم `${organizationId}` مربوطًا. عزل المريض منفصل (`getPatientSessionFromRequest` + فحص own-id).
**معزول / بلا ارتباط:** لا شيء وظيفي — بالتصميم معزول عن التشغيل. المخاطر فقط: `demo-accounts` صفحة public تعرض إيميلات/باسوردات تجريبية — يجب إطفاؤها إنتاجيًا — G15.

---

## 2) Cross-Role Handoffs (أهم جزء)

| # | Handoff | الحالة | الدليل | الفجوة |
|---|---------|--------|--------|--------|
| H1 | Reception → Doctor (تحويل من الانتظار لغرفة الكشف) | 🟡 شبه سليم (status-driven) | `lib/reception.ts:20-94` + `api/appointments/[id]/check-in|check-out|no-show` + `api/queue (GET arrived,in_progress)` + `api/queue/actions (call-next/complete)` + `reception-board.tsx:47-68` + `doctor-board.tsx:49-61` + `dashboard/page.tsx:241-242` | الإغلاق لا ينشئ Encounter (G3)؛ بديلا الإغلاق (`queue complete` vs `check-out`) غير متزامنين؛ Empty States بلا CTA (G14) |
| H2 | Nurse → Doctor (Vitals قبل الكشف) | 🔴 مكسور UI (البيانات موجودة، التسليم غائب) | كتابة `api/vitals (POST, BMI auto)` + قراءة `?patientId&encounterId` + `lib/vitals.ts:48-55` سليمة؛ لكن `encounters-workspace.tsx` = صفر `vital`؛ العرض فقط في `/patients/[id]` (`VitalsTrendCard`) و`/summary`؛ الـ stream مستخدم في البوابة فقط | G4 — يحتاج: زر Vitals في Queue/Encounter + snapshot تلقائي في مساحة الكشف + live update للطاقم |
| H3 | Doctor → Pharmacist (الروشتة + خصم مخزون) | 🔴 مكسور (قائمة مشتركة فقط، بلا صرف ولا خصم) | الإنشاء `api/prescriptions (POST + allergy advisory + encounter link)` + التضمين `encounters-workspace.tsx:239-246` سليم؛ العرض `prescriptions/page.tsx:57-74,275-285` سليم؛ لكن `setStatus` لا يضبط `sentToPharmacy` أبدًا؛ `send/route.ts` غير موصول؛ صفر رابط مخزون | G5/G8 — يحتاج: زر Dispense يضبط `completed + sentToPharmacy` ويخصم `InventoryTransaction usage` ويشعر الفاتورة |
| H4 | Doctor/Reception → Biller (توليد الفاتورة) | 🔴 يدوي بالكامل (لا توليد تلقائي) | الإغلاقات الثلاثة لا تنشئ فاتورة؛ الإنشاء `api/billing/invoices (POST + catalog lookup + coupon)` يدوي سطر واحد؛ الدفع `api/payments + lib/payments.ts:34-38` سليم؛ الإيصال `print/receipt/[invoiceId]` سليم؛ الاستثناء: إيداع الحجز الذاتي فقط | G7 — يحتاج: `closeVisit` ترانزكشن (encounter→invoice lines: كشف + أدوية مصروفة + إجراءات) |
| H5 | Biller → Patient Portal (الفاتورة/الدفع للمريض) | 🟡 نصفه سليم | `api/patient-portal/invoices (GET own-id)` + `patient-portal/page.tsx:783-835` + `POST /patient-portal/payments → Stripe url` سليمة؛ لكن الروشتة غائبة تمامًا؛ السجل الطبي غائب (3 أزرار disabled) | G10 — يحتاج: `portal prescriptions + visit history` API + UI + إزالة الـ dead-ends أو تفعيلها |
| H6 | Owner (رؤية كل شيء) | 🟢 سليم وظيفيًا | `analytics/dashboard (kpis)` + `reports/monthly (perDay/perDoctor/perService + CSV/XLSX/print)` + `dashboard/page.tsx:31-32` سليمة | منخفض — يحتاج فقط إصلاح تناقضات العرض (G12) + فلاتر موحدة |
| H7 | Super Admin (عزل كامل + tenants) | 🟢 قوي | `lib/roles.ts:89-110` (فحص مزدوج) + `lib/org.ts:20-60` + كل clinic routes مفلترة + super تستثني `platform-admin` | منخفض — يحتاج اختبار اختراق مباشر (Phase 3) + إطفاء `demo-accounts` إنتاجيًا (G15) |

**التسلسل المستهدف (بعد الإصلاح):**
`بوابة (حجز) → استقبال (Check-in → Queue) → تمريض (Vitals مربوطة بالزيارة) → طبيب (يرى Vitals → تشخيص → روشتة من Template/DB → تحاليل/إجراءات → إغلاق يولّد فاتورة) → صيدلي (صرف → خصم مخزون → تحديث حالة + فاتورة فعلية) → محاسب (تحصيل → إيصال) → بوابة (روشتة + فاتورة + سجل + متابعة) → مالك (تقارير)` — اليوم: كل عقدة تعمل منفردة، والأسهم بينها إما يدوية أو مفقودة (H2,H3,H4,H5).

---

## 3) Gap List (مكانها بالضبط في الكود)

| ID | الخطورة | [الرول] → [الخطوة] | الوصف | المكان بالضبط |
|----|---------|---------------------|-------|----------------|
| G1 | 🔴 | [Doctor] → [كتابة روشتة: Medication DB] | لا توجد قاعدة أدوية — إدخال نص حر. لا select من مخزون/كتالوج، لا جرعة/شكل مقترح | `components/prescriptions/new-prescription-dialog.tsx:384-403` (أول سطر → top-level، الباقي `items[]`) + `app/api/prescriptions/route.ts:45-183` (`medicationName` string) + `prisma/schema.prisma` (لا موديل `Medication`) |
| G2 | 🔴 | [Doctor] → [قوالب الروشتة CRUD] | API القوالب موجود (`prescription-templates`, `favorites`) لكن صفر بيانات + لا واجهة اكتشاف واضحة من داخل مؤلف الروشتة | `app/api/prescription-templates/route.ts` + `[id]/route.ts` + `[id]/use/route.ts` + `app/api/prescriptions/favorites/route.ts` + `prisma/seed.js` (صفر `PrescriptionTemplate/MedicationFavorite/ClinicalTemplate` — grep = صفر) |
| G3 | 🔴 | [Reception] → [بدء الزيارة Encounter] | الإغلاق (`complete/check-out`) لا ينشئ Encounter؛ بدء الزيارة يدوي بدون `appointmentId`؛ مساران متوازيان للإغلاق | `lib/reception.ts:20-24` + `api/queue/actions/route.ts:48-86` + `api/encounters/[id]/route.ts:20-33` + `components/encounters/encounters-workspace.tsx:74-85` (`startEncounter({patientId})` فقط) |
| G4 | 🔴 | [Nurse] → [Vitals تظهر للدكتور] | مساحة الكشف لا تعرض Vitals إطلاقًا؛ الـ stream للبوابة فقط؛ لا زر إدخال للممرضة في Queue | `components/encounters/encounters-workspace.tsx` (grep `vital` = صفر) + `hooks/use-vitals-stream.ts:13-66` (مستخدم فقط في `app/patient-portal/page.tsx:33,71`) + `app/(dashboard)/patients/[id]/page.tsx:368` (العرض البديل الخارجي) |
| G5 | 🔴 | [Doctor] → [تسليم الروشتة للصيدلي] | `sentToPharmacy` موجود API لكن الـ UI لا يضبطه أبدًا؛ `send` غير موصول؛ لا حالة Pending واضحة | `app/api/prescriptions/[id]/route.ts:13,18,56` + `app/api/prescriptions/[id]/send/route.ts:44-120` + `app/(dashboard)/prescriptions/page.tsx:110-126,275-285` (`setStatus` يرسل `{status}` فقط) |
| G6 | 🟡 | [Nurse] → [تنفيذ إجراءات حقن/تطعيم] | لا فلو تمريضي مستقل — `procedure-orders` عامة بلا تمييز منفّذ/دور | `app/api/procedure-orders/route.ts` + `[id]/route.ts` + `schema.prisma` (`ProcedureOrder` بلا `performedByRole`) — قرار مطلوب: تصميم أو استبعاد موثق |
| G7 | 🔴 | [Biller] → [توليد تلقائي عند الإغلاق] | لا فاتورة عند إغلاق الزيارة؛ الإنشاء يدوي سطر واحد؛ لا تجميع (كشف+أدوية+إجراءات) | `app/api/encounters/[id]/route.ts:20-33` + `app/api/queue/actions/route.ts` + `app/api/billing/invoices/route.ts:53-185` + `components/billing/new-invoice-dialog.tsx:86-103` |
| G8 | 🔴 | [Pharmacist] → [صرف + خصم مخزون + تنبيه حد] | لا زر Dispense؛ الصرف لا يخصم؛ لا FEFO/صلاحية؛ `alerts` API بلا استدعاء من فلو الصرف | `app/(dashboard)/prescriptions/page.tsx` (بلا dispense) + `app/api/inventory/[id]/transaction/route.ts:35-77` (يدوي) + `app/(dashboard)/inventory/page.tsx:41-67,196-240` (عرض فقط) + `schema.prisma` (`InventoryItem.expiryDate/batchNumber` مفرد) |
| G9 | 🔴 | [Seed] → [أدوية/مخزون/قوالب] | 15 صنف مخزون تجاري فقط؛ لا 50-100 دواء (علمي/تجاري/جرعة/شكل)؛ صفر قوالب | `prisma/seed.js` (7 أساسي: Concor/Glucophage/Panadol Extra/gloves/syringes/alcohol/gauze + 8 bulk) + غياب `MedicationFavorite/PrescriptionTemplate/ClinicalTemplate` |
| G10 | 🔴 | [Portal] → [رؤية الروشتة/السجل] | المريض لا يرى روشتته ولا سجله — صفر API + صفر UI | `app/patient-portal/page.tsx` (grep `prescription` = صفر) + `app/api/patient-portal/` (لا `prescriptions`/`history` — الموجود: `overview/invoices/payments/intake/consents/documents/feedback`) |
| G11 | 🟡 | [Portal] → [تأكيد بعد الحجز + خطوة تالية] | بعد الحجز toast فقط بلا ticket؛ 3 أزرار disabled؛ لا تذكير في البوابة | `components/booking/book-clinic-client.tsx:46-68,82-103` + `app/api/book/[orgSlug]/appointments/route.ts:27-99` + `app/patient-portal/page.tsx:355-394,513-642` |
| G12 | 🟡 | [صلاحيات عرض] → [روابط ميتة] | Sidebar يعرض `/automation` (D,N) و`/campaigns` (R) لكن proxy يطردهم (Owner-only)؛ `/queue` للـ Nurse ظاهر بلا module؛ `insurance/equipment/prescriptions/staff/integrations` مفتوحة URL لأي رول | `components/ui/dashboard-with-collapsible-sidebar.tsx` (`navGroups/canAccess`) vs `src/proxy.ts` (`CLINIC_PAGE_ACCESS`) vs `lib/permissions.ts` (`ROLE_MODULE_ACCESS`) |
| G13 | 🟡 | [صلاحيات سيرفر] → [صفحات بلا guard] | كل صفحات `(dashboard)` الـ client بلا role-guard سيرفر (تعتمد proxy + API 403)؛ `/settings,/staff,/integrations,/print/*,/patients/[id]` تُفتح shell بالـ URL | `(dashboard)/layout.tsx` (بلا guard) + كل `page.tsx` الـ `"use client"` + `proxy.ts` (لا يغطي `/staff,/integrations,/prescriptions,/insurance,/equipment,/print/*`) |
| G14 | 🟡 | [UX] → [شاشات فارغة بلا توجيه] | `queue_empty, wl_empty, trend_empty, portal_no*, pay_empty, reports_noData` نصوص static بلا CTA/خطوة تالية (باستثناء `rx_empty, billing_empty`) | `lib/i18n/dictionaries/en.ts:212,360,389,1291` + `queue/page.tsx:147` + `waitlist/page.tsx:277` + `vitals-trend-card.tsx:100` + `patient-portal/page.tsx` |
| G15 | 🟡 | [أمن] → [demo-accounts مكشوفة] | صفحة public تعرض إيميلات + باسوردات (`admin123/patient123`) + quick-login — خطر إنتاجي | `app/demo-accounts/page.tsx` + `proxy.ts` (`PUBLIC_PAGE_PREFIXES` تتضمن `/demo-accounts`) |
| G16 | 🟢 | [عزل Tenants] → [حقول بلا orgId مباشر] | 12 موديلًا بلا `organizationId` مباشر (يُشتق عبر الأب): `RolePermission, UserRole, PatientSession, EmergencyContact, EncounterNote, Vital, PrescriptionItem, InventoryTransaction, Payment, InvoiceLineItem, Installment, InsurancePolicy` + `Consent.organizationId` بلا FK | `prisma/schema.prisma` (1372 سطرًا) — يجب أن يبقى الاشتقاق عبر `patient/invoice/item/role` + فحص `getPatientSessionFromRequest` — سليم اليوم لكن هش عند أي كويري جديدة |

---

## 4) ملحق: Endpoints المعزولة بلا مدخل UI (مؤكد)

- `POST /api/prescriptions/[id]/send` — يعمل، لا زر في `prescriptions/page.tsx`.
- `GET /api/inventory/alerts` — يعمل، لا عرض تنبيه في `inventory/page.tsx` ولا ربط بصرف.
- `POST /api/inventory/[id]/transaction` — يعمل، يدوي فقط (`reason` حر)، لا استدعاء تلقائي من أي فلو.
- `GET /api/vitals/stream` (SSE) — يعمل، مستهلك وحيد: البوابة.
- `POST /api/waitlist/[id]/book` — يعمل وممتاز (`$transaction`)، لكن `portal_noSlots` لا يقترح "انضم للانتظار".
- `GET /api/reports/monthly` + `analytics/dashboard` — يعملان، لكن لا فلترة موحدة (تاريخ/طبيب/خدمة) في واجهة واحدة للـ Owner.

## 5) ملحق: Seed Data الفعلية (من `prisma/seed.js` — 2713 سطرًا)

- Tenants: `platform-admin` + `alexandria-medical-center` (الإسكندرية، `Africa/Cairo`، `EGP`، plan clinic).
- Staff (`admin123`): superadmin + owner + 2 doctors (باطنة/أطفال) + 2 reception + nurse + biller + pharmacist.
- Patients (`patient123`): 20 (6 curated `MRN-1001..1006` + 14 مولدين).
- Inventory: 15 صنفًا فقط. Medications DB: صفر. Templates/Favorites: صفر.
- Appointments ~43، Encounters ~14 (+vitals/notes)، Prescriptions ~15 (كونكور/جلوكوفاج/أتورفاستاتين/زيرتك/أموكسيسيلين/فيتامين د)، Invoices 19، Labs/Procedures/Documents/Consents/Claims/Tasks/Waitlist/Comms — كلها موجودة لكن **غير مربوطة end-to-end** (فواتير غير مربوطة بـ encounters، روشتات غير مخصومة).

---

## 6) البوابة للمرحلة 2 (لا نبدأ قبل موافقتك)

1. اعتماد هذا الملف + ترتيب الإصلاح: المقترح `G4 → G3 → G1/G2/G9 → G5/G8 → G7 → G10/G11 → G12/G13/G14/G15`.
2. قرارك في G6 (فلو تمريضي للحقن/التطعيم: نصممه أم نستبعده موثقًا؟).
3. بعد الموافقة: نبني الـ End-to-End Flows + الـ Seed (50-100 دواء + قوالب) + `TEST_REPORT.md` بالسيناريو الكامل، ثم `PERMISSIONS_MATRIX.md` و`USER_STORIES.md`.

> راجع أيضًا (موجود مسبقًا ولا يغني عن هذا الملف): `user-stories-by-role.md` (سرد بشري غير تقني)، `SYSTEM_SIDEBAR_AUDIT.md` (تدقيق Sidebar فقط)، `PROJECT_AUDIT_REPORT.md` / `CRM_GAP_ANALYSIS.md` (تحليلات قديمة جزئية).
