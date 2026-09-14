# PERMISSIONS_MATRIX.md — مصفوفة الصلاحيات (مطبقة سيرفر فعليًا)

>Legend: ✅ مسموح · ❌ ممنوع (403 سيرفر) · 🔀 مشروط · `E2E` = مُختبر حيًا في `TEST_REPORT.md`
> القاعدة الذهبية: إخفاء الواجهة **ليس** حدًا أمنيًا — كل سطر أدناه له Guard سيرفر (API + proxy + صفحات Owner/Biller).
> الأدوار الثمانية: Owner · Doctor · Reception (=Care Coordinator) · Nurse · Biller · Pharmacist · Patient Portal · Super Admin.

## 1) المرضى

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| عرض/بحث المرضى | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔀 ملفه فقط | ❌ | `api/patients/route.ts` (`patients:read`) + proxy `/patients` (E2E: عيادة B → 404) |
| تسجيل/تعديل مريض | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `patients:write` (E2E: استقبال سجّل حيًا) |
| أرشفة/دمج | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `patients/[id]/archive|merge` (org-scoped) |
| تحديث البروفايل من البوابة | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ معطل | ❌ | زر معطل `portal_updateProfile` — مقصود (E2E لم يكسره) |

## 2) المواعيد والطابور والانتظار

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| حجز/تعديل/إلغاء (طاقم) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `appointments:write` + تعارض 409 + توفر الدكتور (`lib/appointments.ts:89`) |
| حجز ذاتي (بوابة) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ مواعيده | ❌ | `book/[orgSlug]` (جلسة مريض + `patient.organizationId==org.id` وإلا 403) |
| Check-in/out/no-show | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `lib/reception.ts:32` + `appointments:write` (E2E حي) |
| طابور اليوم + بدء الكشف | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | proxy `/queue` + API (`queue` module — أُضيف للممرضة G13؛ E2E: ظهور المريض) |
| إلغاء/تعديل موعده (بوابة) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ مستقبلي فقط | ❌ | `canPatientCancel/RescheduleAppointment` (مستقبلي + scheduled/confirmed) |
| قائمة الانتظار + حجز منها | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `waitlist` module + `$transaction` (حجز+قلب booked) |

## 3) السريري (زيارات/حيوية/قوالب/إجراءات)

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| بدء/توثيق/إغلاق زيارة | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `encounters` module + `encounters:write` (E2E: مربوطة بالموعد) |
| تسجيل Vitals | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `encounters:write\|patients:write` + BMI تلقائي (E2E: 120/80 + BMI 24.2) |
| رؤية Vitals في مساحة الكشف | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | 🔀 قراءة فقط (بوابته) | ❌ | `GET /api/vitals?patientId&encounterId` + SSE (G4؛ E2E حي) |
| قوالب SOAP | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `clinical-templates` (org-scoped + author) |
| تنفيذ إجراء (حقن/تطعيم) G6 | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `PATCH procedure-orders` — المنفّذ يُسجّل سيرفر (`performedByRole/UserId`) + بطاقة "إجراءات اليوم" |
| طلب تحاليل/مراجعتها | ✅ | ✅ | ❌ | ✅ | ❌ | 🔀 عرض | ❌ | ❌ | `labs` module (الصيدلي عرض ضمن `labs` فقط) |

## 4) الروشتات والصيدلة (H3 — كان مكسورًا، أُصلح G5/G8)

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| كتابة روشتة (من DB/قالب) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `labs` + `encounters:write\|patients:write` + فحص حساسية (E2E حي) |
| بحث قاعدة الأدوية | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | `medications/search` (labs read؛ مخزون `category=medication`) |
| إدارة قوالب الروشتات | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `prescription-templates` (شخصي + مشترك + `use` يرفع العداد) |
| **صرف + خصم مخزون** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | `POST prescriptions/[id]/dispense` (labs + `inventory:write\|encounters:write\|patients:write`) — ترانزكشن واحدة: تحقق مخزون (409 عند العجز) + `usage` + `completed+sentToPharmacy` (E2E: 300→298) |
| إكمال/إلغاء بدون صرف | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | `PATCH` (الحذف للملغاة فقط وإلا 409) |
| رؤية روشتته (بوابة) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `patient-portal/prescriptions` (own-id فقط؛ E2E حي) |

## 5) المخزون والمعدات

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| عرض المخزون/التنبيهات | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | `inventory` module + `inventory:read` |
| إضافة صنف/حركة يدوية | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | `inventory:write` + كمية لا تسلب (`max(0)`) |
| المعدات والصيانة | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | proxy `/equipment` (Nurse/Pharmacist) + `inventory:write` |

## 6) الفوترة والمدفوعات والتأمين (H4 — كان يدويًا، أُصلح G7)

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| فاتورة تلقائية عند إغلاق الزيارة | — نظام — | — تُولّد لإغلاقه — | ❌ | ❌ | ✅ يراها | ❌ | ❌ | ❌ | `lib/auto-invoice.ts` (استشارة + إجراءات مسعّرة + بنود صرف 0) — idempotent `encounter-<id>` (E2E: `INV-… 300`) |
| إنشاء فاتورة يدوية/خصم/تقسيط | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | `billing:write` + entitlement + كتالوج/كوبون (E2E: الدكتور 403) |
| تحصيل/استرداد | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | 🔀 دفع فواتيره (Stripe) | ❌ | `payments` + `resolveInvoiceStatus` (E2E: `paid 300/300`) |
| تأمين (وثائق/مطالبات) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | proxy `/insurance` (Biller) + `billing` guards |
| رؤية فواتيره ودفعها (بوابة) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | `patient-portal/invoices|payments` (own-id؛ E2E حي) |
| حالات الفاتورة | `draft\|sent\|partially_paid\|paid\|overdue` — تُحسب سيرفر (`lib/payments.ts:34`) ولا تُقبل من الكلاينت |

## 7) التواصل والحملات والمستندات والموافقات والمهام

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| رسائل SMS/واتساب/بريد + تذكيرات | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `communications` + plan entitlement |
| الحملات (إنشاء/إطلاق) | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | proxy+module أُصلحا G13 (كانت محظورة خطأً) |
| مستندات (رفع/توليد/عرض) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🔀 عرضه فقط | ❌ | `documents` + روابط موقعة |
| موافقات | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🔀 قبول/رفض (بوابته) | ❌ | `consents` + patient-portal own-id |
| مهام | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | `tasks` module لكل الطاقم |

## 8) التحليلات والتقارير والتدقيق والكتالوجات

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| لوحة التحليلات | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | proxy `/analytics` + API (E2E: تقرير المالك) |
| التقرير الشهري + CSV/XLSX | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | `reports` + `billing:read\|encounters:read` |
| سجل التدقيق (عيادة) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | `audit` module — **append-only حقيقي**: تريجر DB `audit_log_append_only` يمنع UPDATE/DELETE (مُتحقق `information_schema.triggers`) |
| كتالوجات (عرض/إنشاء) | 🔀 عرض الكل/إنشاء ✅ | 🔀 عرض | ❌ | 🔀 عرض | ❌ | 🔀 عرض | ❌ | ❌ | القراءة بموديول، الكتابة `requireOwner` |
| الفروع/الغرف (عرض/إنشاء) | 🔀/✅ | ❌ | 🔀 عرض | ❌ | ❌ | ❌ | ❌ | ❌ | القراءة `locations`، الكتابة Owner |
| التوفر الشخصي | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `PATCH profile/availability` (ذاتي) |

## 9) الإدارة والمنصة

| Action | Owner | Doctor | Reception | Nurse | Biller | Pharmacist | Patient | Super | التنفيذ الخلفي |
|---|---|---|---|---|---|---|---|---|---|
| الإعدادات/الطاقم/التكاملات | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | G13: `page-guards requireClinicPage(Owner)` + proxy + `requireOwner` API (إدراج الطاقم محمي من الـ enumeration) |
| الخطة والاشتراك (عيادة) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `plan/page.tsx requireOwner` + entitlements |
| منصة السوبر (عيادات/خطط/تدقيق) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `requireSuperAdmin` المزدوج (RBAC + `user.role==superAdmin` + active) — E2E حي؛ `platform-admin` مستثناة من التعديل |
| صفحة الديمو | 🔀 عامة (بيانات تجريبية فقط) | 🔀 | 🔀 | 🔀 | 🔀 | 🔀 | 🔀 | ❌ | `/demo-accounts` صفحة public تعرض حسابات الديمو الاصطناعية فقط (`@example.test`) — مقصودة للتجربة |

## 10) مصفوفة الوحدات الافتراضية (المرجع الوحيد: `src/lib/permissions.ts:34`)

- Owner: الكل (25) · Doctor: +`automation` (G13) · Nurse: +`queue`,`automation` (G13) · Reception: +`campaigns` (G13) — المرآة المجمدة `src/lib/roles-guide-data.ts:38` مطابقة تمامًا (اختبار `roles-guide.test.ts` أخضر).
- `insurance/equipment/prescriptions/staff/integrations/print/patients` ليست وحدات مستقلة: تُحمى عبر proxy roles + أقرب module (`billing/inventory/labs`) — لا ثغرة URL مباشر (G13).
