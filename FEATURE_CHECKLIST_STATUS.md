# FEATURE_CHECKLIST_STATUS — مطابقة القائمة المرجعية مع الكود الفعلي

> منهجية: قراءة مباشرة للكود (routes / models / services / UI). لا تخمين.
> legend: ✅ مكتمل end-to-end — 🟡 جزئي — ❌ غير موجود.
> الملفات المحمية (ARCHITECTURE.md, TESTING_PLAN.md, FEATURE_RESEARCH.md, TASKS.md, PROGRESS.md) لم تُمس.

---

## 👤 إدارة المرضى

- [✅] إضافة وإدارة ملفات المرضى — `src/app/api/patients/route.ts` (GET/POST + plan-limit + AuditLog)، `src/app/api/patients/[id]/route.ts` (GET/PATCH)، `src/app/(dashboard)/patients/page.tsx` + `components/patients/add-patient-dialog.tsx` + `patient-profile-sheet.tsx`.
- [✅] البيانات الشخصية والطبية — `prisma/schema.prisma` (model Patient + EmergencyContact)، `src/lib/validations/patient.ts`، `src/lib/patient-sensitive.ts` (تشفير)، `src/lib/patient-auth.ts`.
- [🟡] التاريخ المرضي والحساسية والأدوية — `src/app/api/patients/[id]/history/route.ts` (GET/POST PatientHistory) موجود؛ لا يوجد موديل منفصل منظم لـ Allergy/Medication (نص حر داخل History/EncounterNote فقط).
- [✅] سجل كامل لكل الزيارات والمتابعات — `src/app/(dashboard)/patients/[id]/page.tsx` يجمّع 9 مصادر (appointments/encounters/rx/invoices/labs/diagnoses/followUps/procedures/documents) في Timeline واحد + `src/app/api/patients/[id]/attendance/route.ts`.
- [🟡] البحث السريع ودمج الملفات المكررة — بحث client-side فقط (`dashboard-with-collapsible-sidebar.tsx` بحث علوي + فلتر `?q` في `patients/page.tsx`)، لا بحث سيرفري ولا pagination في `GET /api/patients`. الدمج: **غير موجود** (لا `*/merge` route ولا UI — بحث `merge|dedupe` لا يعطي إلا tailwind-merge).

**ملخص القسم: 3 من 5 فيتشر مكتمل، 2 جزئي، 0 غير موجود.**

---

## 📅 المواعيد والاستقبال

- [✅] حجز وتعديل وإلغاء المواعيد — `src/app/api/appointments/route.ts` (GET/POST/PATCH + idempotencyKey + walk-in token `T-01`)، `src/app/(dashboard)/appointments/page.tsx` + `book-appointment-dialog.tsx` + `edit-appointment-dialog`.
- [🟡] Calendar يومي / أسبوعي / شهري — شهري فقط فعليًا (`components/ui/fullscreen-calendar.tsx` مستخدم في صفحة المواعيد). `components/features/appointments/appointments-calendar.tsx` (أسبوعي) و `recurring-appointment-dialog.tsx` موجودان لكن **غير مستخدمين** (orphaned). لا Day/Agenda view.
- [🟡] Check-in / Check-out — لا endpoint مخصص (`check-in|checkin` = صفر). تتم عبر `PATCH /api/appointments` بالحالات (`scheduled/confirmed → arrived → in_progress → completed`) المحكومة بـ `isAppointmentTransitionAllowed` في `src/lib/appointments.ts`.
- [🟡] إدارة قائمة الانتظار Queue — `src/app/api/queue/route.ts` (GET فقط لمواعيد اليوم `arrived/in_progress`) + `src/app/(dashboard)/queue/page.tsx` قراءة فقط. لا POST/PATCH ولا أكشنات (نقل/استدعاء/تخطي).
- [✅] متابعة حالات المواعيد وNo-show — حالات `scheduled/confirmed/arrived/in_progress/completed/cancelled/no_show` + `summarizeAttendance` + `patients/[id]/attendance` + إشارات `recentNoShows` في `src/app/api/automation/signals/route.ts` و `src/lib/automation.ts`.
- [✅] منع تعارض المواعيد — `hasAppointmentConflict` + `isDoctorAvailable` + `getAvailableSlots` في `src/lib/appointments.ts` + فحص داخل transaction قبل الإنشاء (409). ملاحظة: مايجريشن لاحقة أسقطت الـ unique index (`appointment_active_slot_unique`) — الحماية الآن كود فقط، تحتاج تأكيد DB.

**ملخص القسم: 3 من 6 فيتشر مكتمل، 3 جزئي، 0 غير موجود.**

---

## 🩺 الملف الطبي

- [✅] تسجيل تفاصيل الزيارة — `src/app/api/encounters/route.ts` (POST إنشاء `in_progress`) + `src/app/api/encounters/[id]/route.ts` (PATCH إغلاق) + `components/encounters/encounters-workspace.tsx`.
- [🟡] الأعراض والفحص والتشخيص — سكيمة SOAP موجودة (`src/lib/validations/encounter.ts`: soapNoteSchema/diagnosisSchema) + `src/app/api/encounters/[id]/notes/route.ts` + `src/app/api/clinical-orders/route.ts` (kind:diagnosis). لكن واجهة الـ workspace نص حر فقط (freeform) بدون حقول SOAP منظمة.
- [✅] العلامات الحيوية — `src/app/api/vitals/route.ts` (GET/POST + حساب BMI تلقائي) + `src/app/api/vitals/stream/route.ts` (SSE) + `src/lib/vitals.ts` + `hooks/use-vitals-stream.ts`.
- [✅] الملاحظات الطبية — `POST /api/encounters/:id/notes` (`subjective/objective/assessment/plan/noteType/text`).
- [🟡] خطط العلاج — لا endpoint مستقل `treatment-plan`. تُركّب من (Diagnosis + Prescription + ProcedureOrder + Document). طباعة/قالب مستقل غير موجود.
- [🟡] متابعة تطور حالة المريض — الـ Timeline يعرض الأحداث مرتبة، لكن لا منحنى تطور (vitals trend chart / outcome scores) ولا مقارنة زيارات.
- [❌] Clinical Templates حسب تخصص الطبيب — غير موجود (لا موديل `ClinicalTemplate` في `prisma/schema.prisma`، لا `*template*` API، لا سكيمة).

**ملخص القسم: 3 من 7 فيتشر مكتمل، 3 جزئي، 1 غير موجود.**

---

## 💊 الروشتات والعلاج

- [✅] إنشاء Prescription إلكترونية — `src/app/api/prescriptions/route.ts` (GET/POST + idempotency + items[]) + سكيمة `prescriptionSchema/prescriptionItemSchema` في `validations/encounter.ts`.
- [✅] تحديد الجرعات والمدة والتعليمات — حقول `medicationName/dosage/frequency/duration/instructions` + `PrescriptionItem[]`.
- [🟡] طباعة أو إرسال الروشتة — الطباعة ✅ (`src/app/(dashboard)/print/prescription/[id]/page.tsx` + `print-button.tsx`) وتطبع الحقول المفردة فقط (items[] لا تُطبع). الإرسال للمريض لا زر مباشر (يتم يدويًا عبر Communications).
- [🟡] Treatment Plans — غير موجود ككيان مستقل (يُركّب كما above). لا status machine ولا طباعة.
- [✅] إدارة الإجراءات الطبية والجلسات — `src/app/api/procedure-orders/route.ts` (POST) + `src/app/api/procedure-orders/[id]/route.ts` (PATCH `ordered|in_progress|completed|cancelled` + 409) + `validations/procedures.ts` + ربط Documents عبر `procedureOrderId`.
- [❌] Packages للجلسات والخدمات — غير موجود (لا موديل Package ولا `*package*` API؛ `serviceCatalog` كتالوج خدمات فقط عبر `src/app/api/catalogs/route.ts`).

**ملخص القسم: 3 من 6 فيتشر مكتمل، 2 جزئي، 1 غير موجود.**

---

## 🧪 التحاليل والأشعة

- [✅] طلب التحاليل — `src/app/api/lab-orders/route.ts` (POST `orderType:lab|imaging/testName/priority/indication`) + `components/labs/add-lab-order-dialog.tsx` + `validations/labs.ts`.
- [✅] تسجيل ورفع النتائج — `src/app/api/labs/route.ts` (POST نتيجة + `reportUrl` + تحويل الطلب `resulted`) + `add-lab-result-dialog.tsx` + صفحة `labs/page.tsx` (فلتر + CSV + تمييز abnormal).
- [🟡] طلب الأشعة — لا مسار مستقل؛ يُمثل بـ `LabOrder.orderType=imaging` + `Document.type=imaging`. لا نموذج طلب أشعة ولا رفع مخصص ولا PACS.
- [✅] رفع التقارير والصور — `src/app/api/uploads/route.ts` + `src/app/api/documents/route.ts` (Cloudinary storageKey/publicId) + `upload-document-dialog.tsx` + `validations/uploads.ts` (يسمح pdf/jpeg/png/webp للـ imaging).
- [✅] حفظ كل النتائج داخل ملف المريض — نتائج المختبر ضمن Timeline في `patients/[id]/page.tsx` + `GET /api/labs?patientId` + `GET /api/lab-orders?patientId`.

**ملخص القسم: 4 من 5 فيتشر مكتمل، 1 جزئي، 0 غير موجود.**

---

## 🔄 متابعة المرضى

- [✅] تحديد مواعيد Follow-up — `followUpSchema` في `validations/encounter.ts` + `POST /api/clinical-orders {kind:followUp}` (يخلق `FollowUp{dueDate}`) + قراءة عبر `GET /api/clinical-orders?patientId`.
- [🟡] تنبيهات بالمرضى المستحق متابعتهم — `GET /api/automation/signals` يعيد `overdueFollowUps` (read-only). لا دفع إشعار ولا cron يرسل تنبيه.
- [🟡] متابعة المرضى المتأخرين — نفس الإشارة (dueDate<now) + مهام يدوية (`tasks` API + `tasks/page.tsx`)، بدون تصعيد تلقائي أو رسائل.
- [✅] Patient Timeline — `src/app/(dashboard)/patients/[id]/page.tsx` (تجميع 9 أنواع أحداث + أيقونات + `timeline_*` i18n). لا ملف منفصل (glob `*timeline*` = صفر — مضمّن في صفحة المريض).
- [🟡] تنبيهات للحالات المهمة — إشارات `lab_review` (abnormal غير مراجَع) و `no_show` في `src/lib/automation.ts` (read-only حتى 50 إشارة)، بدون إشعار فوري.

**ملخص القسم: 2 من 5 فيتشر مكتمل، 3 جزئي، 0 غير موجود.**

---

## 📱 التواصل مع المرضى

- [🟡] WhatsApp Integration — تكامل حقيقي عبر Twilio (`src/lib/communications.ts`: `sendWhatsApp` بـ `whatsapp:TWILIO_WHATSAPP_NUMBER`) وليس stub، لكن مشروط بالإعدادات (بدونها يفشل برسالة `Twilio not configured`)، وبدون قوالب Business معتمدة ولا launch للحملات.
- [✅] SMS / Email — `sendSMS` (Twilio) + `sendEmail` (nodemailer/gmail) + `src/app/api/communications/route.ts` (إرسال فوري أو مجدول `scheduledFor`) + صفحتا `communications/campaigns`.
- [✅] تذكير تلقائي بالمواعيد — `src/app/api/communications/appointment-reminders/route.ts` (cron كل ساعة: مواعيد 24h القادمة، منع تكرار عبر Communication، سجلات per-channel sent/failed) + `src/app/api/communications/scheduled/route.ts` (cron كل دقيقة). الحماية بـ `src/lib/cron-auth.ts`. ملاحظة: لا cron أصلي في `vercel.json` — يُدار خارجيًا (cron-job.org).
- [🟡] رسائل المتابعة — يدوي عبر Communications + عرض تلقائي وحيد (`waitlist_offer` عند `autoOfferFreedSlot` في `src/lib/waitlist.ts`). لا أتمتة رسائل post-visit/drip.
- [🟡] إرسال الروشتات والفواتير — لا زر `send Rx/invoice` مباشر. يُرسل يدويًا كنص عبر Communications. الـ Portal يعرض الفواتير والمستندات للتحميل الذاتي.
- [✅] Patient Portal — `src/app/api/patient-portal/overview|invoices|payments|documents|consents` + `appointments/[id]/cancel|reschedule` + `src/app/api/patient-auth/login|me|logout` (كوكي `patient_session`) + صفحات `patient-portal`.
- [✅] Online Booking — `src/app/api/book/[orgSlug]/availability` (نافذة 60 يوم + slots من ساعات الطبيب) + `src/app/api/book/[orgSlug]/appointments` (حجز + فاتورة deposit draft ذريًا) + صفحة `book/[orgSlug]`.
- [❌] تقييم المريض للخدمة — غير موجود (بحث `rating|review.*patient|feedback` لا يعطي فيتشر؛ لا موديل ولا API ولا UI).

**ملخص القسم: 4 من 8 فيتشر مكتمل، 3 جزئي، 1 غير موجود.**

---

## 💰 الحسابات والفواتير

- [✅] إنشاء الفواتير — `src/app/api/billing/invoices/route.ts` (lineItems + سعر الكتالوج + ترقيم `INV-` + status draft) + صفحة `billing`.
- [✅] تسجيل المدفوعات — `src/app/api/payments/route.ts` (Stripe PaymentIntents + منع overpay + Payment pending) + `src/app/api/patient-portal/payments/route.ts` (Checkout Sessions) + صفحة `payments`.
- [🟡] Cash / Card / Transfer / Online Payment — بطاقات/أونلاين فقط عبر Stripe. لا تتبع لطرق كاش/تحويل/شبكة ولا `paymentMethod` يدوي.
- [🟡] خصومات وتقسيط — خصم per-line فقط (`discountAmount/taxAmount` في `validations/billing.ts` + حساب السطر). لا كوبونات/نسب/قواعد، ولا موديل `installments` (صفر نتائج).
- [✅] المتبقي على المريض — `Invoice{totalAmount/amountPaid}` + حالات `partially_paid/overdue` + `outstandingBalance` في `analytics/dashboard` + رصيد الـ Portal (`patient-portal/invoices`).
- [🟡] Refunds — استقبال فقط عبر ويبهوك (`webhooks/stripe` حدث `charge.refunded` يحدّث Payment/invoice بلا تكرار عبر `lib/webhooks.ts`). لا endpoint لبدء استرداد من الطاقم (`*refund*` API = صفر).
- [✅] تقارير الإيرادات والمصروفات — إيرادات ✅ (`revenueThisMonth/outstanding` في `analytics/dashboard` + `reports/monthly` summary). مصروفات ❌ (لا موديل Expenses).
- [🟡] Insurance & Claims — `src/app/api/insurance/policies` + `policies/[id]/eligibility` (فحص محلي `checkEligibility` وليس clearinghouse) + `claims` (POST submitted) + `claims/[id]` (آلة حالات `submitted→pending→paid/denied→appeal` + تقييد على المستحق). لا تكامل دافع حقيقي.

**ملخص القسم: 4 من 8 فيتشر مكتمل، 4 جزئي، 0 غير موجود.**

---

## 📦 المخزون

- [✅] إدارة الأدوية والمستلزمات — `src/app/api/inventory/route.ts` (GET/POST name/sku/category/quantity/reorderLevel/unit) + صفحة `inventory` + `add-item-dialog`.
- [✅] Stock In / Stock Out — `src/app/api/inventory/[id]/transaction/route.ts` (`restock|usage|adjustment` + `InventoryTransaction` + منع السالب) + سكيمة `inventoryTransactionSchema`.
- [✅] الكميات — `InventoryItem.quantity` + تحديث ذري عبر transaction.
- [❌] Expiry Dates — غير موجود (لا حقل `expiryDate` في سكيمة `InventoryItem` `prisma/schema.prisma:743` ولا API ولا تنبيه).
- [❌] Batch Numbers — غير موجود (لا `batchNumber/lot` في الموديل ولا ربط Transaction بالدفعة).
- [🟡] تنبيهات نقص المخزون — client-only (`inventory/page.tsx` فلتر `quantity<=reorderLevel` + بانر `inv_lowStock`). لا API تنبيهات ولا cron ولا Notification.
- [🟡] إدارة الأجهزة والمعدات والصيانة — موديل `Equipment` موجود (`prisma/schema.prisma:416`) لكن **بلا أي API/UI** (glob `*equipment*` = صفر). لا سجل صيانة.

**ملخص القسم: 3 من 7 فيتشر مكتمل، 2 جزئي، 2 غير موجود.**

---

## 👨‍⚕️ إدارة الأطباء والموظفين

- [✅] إدارة الأطباء والتخصصات — `User{specialty/licenseNumber}` + `src/app/api/staff/route.ts` (GET قائمة + PATCH للبروفايل) + `src/app/api/staff/roles/route.ts`.
- [✅] مواعيد وساعات العمل — `src/app/api/profile/availability/route.ts` (سكيمة `availabilityUpdateSchema`) + صفحة `availability` + `availability-form.tsx` + محرك `isDoctorAvailable/getAvailableSlots`.
- [✅] الغرف والفروع — `src/app/api/branches` + `branches/[id]` + `src/app/api/rooms` + `rooms/[id]` (Owner + zod + audit) + صفحة `locations` + `validations/location.ts`.
- [🟡] إدارة الموظفين — الـ APIs موجودة لكن **لا صفحة staff مخصصة** (glob `staff/page` = صفر؛ الإدارة عبر `settings` + APIs فقط). لا shifts/rota — نافذة أسبوعية لكل مستخدم فقط.
- [✅] Roles & Permissions — `src/lib/roles.ts` + `permissions.ts` (CLINIC_MODULES + ROLE_MODULE_ACCESS + requireModulePermission) + `authorization.ts` (requireAnyPermission) + `role-labels.ts` + بوابات `proxy.ts`.
- [✅] Multi-Doctor — `Appointment.providerId` + تقارير `perDoctor` في `reports/monthly` + فلترة وتوزيع.
- [✅] Multi-Branch — `branchId` على (User/Appointment) + فروع وغرف متعددة + حجز per-org/branch.

**ملخص القسم: 6 من 7 فيتشر مكتمل، 1 جزئي، 0 غير موجود.**

---

## 📊 التقارير ولوحات التحكم

- [✅] Dashboard للإدارة — `src/app/(dashboard)/dashboard/page.tsx` + `src/app/api/analytics/dashboard/route.ts` (KPIs: مرضى نشطين/مواعيد اليوم/إنجاز شهري/no-show/إيراد/مستحق/جدد×عائدين).
- [🟡] Dashboard للطبيب — نفس اللوحة العامة للجميع؛ لا لوحة per-doctor (عياداتي/وصفاتي/مرضاي) مخصصة.
- [🟡] Dashboard للاستقبال — نفس اللوحة؛ لا لوحة (حضور اليوم/قائمة الانتظار/تحصيل) مخصصة.
- [🟡] تقارير المرضى — عدّادات (`activePatients/newVsReturning` عبر `splitNewVsReturning`) بدون تقرير قابل للتصدير أو تقطيع عمري/جغرافي.
- [✅] تقارير المواعيد — `src/app/api/reports/monthly?month=` (summary total/completed/cancelled/noShow/completionRate + perDay) + `components/reports/reports-dashboard.tsx` + صفحة `reports`.
- [✅] تقارير الإيرادات — `revenueThisMonth/outstanding` + `summary{revenue/outstanding}` شهريًا.
- [🟡] تقارير الخدمات والإجراءات — الكتالوج موجود (`catalogs`) لكن لا تقرير إيراد/عدد per-service/per-procedure.
- [🟡] تقارير المتابعة — إشارات المتابعة في automation فقط؛ لا تقرير التزام/overdue rate.
- [✅] تقارير أداء الأطباء — `perDoctor[]` في التقرير الشهري (عبر `$queryRaw`).
- [🟡] إحصائيات النمو — `new vs returning` فقط (`lib/appointments.ts`)؛ لا منحنيات نمو/retention/cohort ولا تصدير CSV/XLS ولا تقارير مجدولة.

**ملخص القسم: 4 من 10 فيتشر مكتمل، 6 جزئي، 0 غير موجود.**

---

## 🔐 الأمان

- [✅] صلاحيات حسب المستخدم — RBAC كامل (أدوار + صلاحيات module/action + بوابات API + proxy) + عزل مستأجر (`organizationId` في كل استعلام) + اختبار `tenant-isolation`.
- [✅] حماية البيانات الطبية — عزل `organizationId` + تشفير `AES-256-GCM` (`src/lib/crypto.ts` + `patient-sensitive.ts`) + تجزئة توكنز (`email.ts`) + `scrypt` للباسورد (`password.ts`) + مفتاح إجباري في الإنتاج (`boot-env.ts`).
- [❌] Two-Factor Authentication — غير موجود (بحث `totp|two-factor|authenticator|otp` في `src` = صفر؛ لا `totpSecret` في السكيمة).
- [✅] Audit Logs لمعرفة من قام بأي تعديل — موديل `AuditLog` + `src/lib/audit.ts` (مستخدم في 30+ route) + `src/app/api/audit/route.ts` + صفحة `audit` + `src/app/api/super/audit`.
- [🟡] تشفير وحماية الملفات — تشفير DB للحقول الحساسة ✅؛ ملفات Cloudinary تعتمد على حماية المزود (signed URLs/فولدرات org-scoped) بدون تشفير ملفات صريح داخل التطبيق.
- [❌] Automatic Backup & Recovery — غير موجود كفيتشر تطبيق (لا `/api/backups` ولا سكربت؛ `scripts/` بلا نسخ احتياطي؛ النسخ مسؤولية Postgres المستضاف فقط).

**ملخص القسم: 3 من 6 فيتشر مكتمل، 1 جزئي، 2 غير موجود.**

---

## 📄 المستندات

- [✅] Prescription — طباعة A5 (`print/prescription/[id]`) + `print-button.tsx` + أنماط `globals.css`.
- [❌] Medical Report — غير موجود (لا قالب ولا طباعة؛ `referral|medical.?report|discharge|certificate` لا تتجاوز مثال نوع مستند في i18n).
- [❌] Referral — غير موجود (لا ملف ولا API ولا قالب).
- [🟡] Lab Request — الطلب موجود كبيانات (`lab-orders`) لكن لا مستند طلب قابل للطباعة/التوقيع.
- [❌] Radiology Request — غير موجود (لا طلب مستقل ولا طباعة).
- [❌] Treatment Plan — غير موجود (لا كيان ولا مستند).
- [✅] Invoice — إيصال طباعة (`print/receipt/[invoiceId]`).
- [🟡] Patient Summary — صفحة Timeline للعرض فقط؛ لا مستند ملخص قابل للطباعة/المشاركة (ملخص AI غير موجود أصلًا).
- [🟡] PDF / Print — طباعة متصفح فقط (`window.print` + CSS). لا مكتبة PDF (`jspdf|pdfkit|puppeteer|react-pdf` = صفر) ولا توليد سيرفر.

**ملخص القسم: 2 من 9 فيتشر مكتمل، 3 جزئي، 4 غير موجود.**

---

## 🌐 التكامل والتقنيات المتقدمة

- [✅] Arabic / English + RTL — `src/lib/i18n/locale.ts` + قاموسا `en/ar` (parity كاملة) + `locale-provider` + `language-switcher` + `layout` (dir) + RTL CSS.
- [✅] WhatsApp / SMS / Email — Twilio (SMS/WhatsApp) + Nodemailer/Resend (email) + قوالب `renderAppointmentReminder/renderCampaignMessage` + cron المجدول والتذكيرات.
- [🟡] Payment Gateways — Stripe فقط (`lib/stripe.ts` + payments + portal checkout + webhook idempotent). لا Paymob/Fawry/PayPal/InstaPay/Vodafone Cash (صفر نتائج).
- [❌] Google Calendar — غير موجود (لا OAuth ولا مزامنة؛ التقويم داخلي فقط `fullscreen-calendar/appointments-calendar/ThreeDWallCalendar`).
- [🟡] APIs — وكيل FHIR قراءة فقط (`src/app/api/integrations/fhir/[...path]/route.ts`: allowlist + patient-scoped + 501 عند غياب الإعداد). لا كتابة ولا توثيق REST عام ولا مفاتيح API للعيادات.
- [🟡] تكامل مع المعامل والأشعة — رفع يدوي (uploads/documents/reportUrl) فقط؛ لا LIS/PACS ولا HL7/FHIR write.
- [🟡] Patient & Doctor Mobile Apps — PWA فقط (`manifest.ts` + Serwist + push `notifications/push` + VAPID + offline mutations). لا تطبيقات native (Capacitor/Flutter) ولا حزم ستور.
- [❌] AI Medical Documentation — غير موجود (بحث `openai|anthropic|gemini|llm|gpt` = صفر؛ لا `/api/ai*`).
- [❌] AI Patient Summary — غير موجود.
- [❌] AI Search — غير موجود (البحث نصي client-side فقط).
- [🟡] Smart Follow-up & Analytics — إشارات read-only (`automation/signals`: overdue/unreviewed/no-show) بدون أتمتة إرسال أو تحليلات تنبؤية.

**ملخص القسم: 2 من 11 فيتشر مكتمل، 5 جزئي، 4 غير موجود.**

---

## 🎯 الفيتشرز المقترح إضافتها

### P0 — لازم (تشغيل/إيراد/سلامة)

1. **دمج الملفات المكررة + بحث سيرفرسايد مع pagination** — بدونه الداتا تتوسخ والبحث ينهار مع النمو. ❌
2. **استرداد من الطاقم (staff-initiated refunds) + طرق كاش/تحويل + بوابات محلية (Paymob/Fawry/InstaPay)** — Stripe وحده لا يغطي الكاش المنتشر في مصر/MENA. 🟡→❌ جزئيًا.
3. **تقسيط وخصومات منظمة (installments/coupons)** — طلب صريح في القائمة ومفقود تمامًا. ❌
4. **Expiry + Batch/Lot للمخزون مع تنبيهات سيرفر** — سلامة دوائية؛ حقول غير موجودة أصلًا. ❌
5. **قوالب مستندات قابلة للطباعة (Referral/Medical Report/Radiology & Lab Request/Discharge/Sick-leave) + توليد PDF سيرفر** — الطباعة الحالية وصفات وإيصالات فقط. ❌
6. **2FA (TOTP) + نسخ احتياطي واستعادة داخل التطبيق** — عيادة بدون 2FA/Backup لا تُباع للمؤسسات. ❌
7. **Calendar يومي + أكشنات Queue (استدعاء/تخطي/نقل) + حجز من الـ Waitlist** — تشغيل الاستقبال اليومي معطل جزئيًا. 🟡
8. **إعدادات التذكير (cadences 24h/1h + quiet hours) + حالة التسليم per-channel** — التذكير يعمل لكن بلا ضبط ولا رؤية فشل. 🟡
9. **صفحة موظفين + shifts/rota + صلاحيات فرع** — الإدارة عبر settings فقط لا تكفي لسلاسل. 🟡
10. **تقرير مصروفات (Expenses)** — الإيراد وحده لا يعطي صافي ربح؛ القائمة تطلب مصروفات صراحة. ❌

### P1 — مهم (تحويل واحتفاظ)

1. **Clinical Templates per-specialty + SOAP UI منظمة** — يسرّع التوثيق ويوحّد الجودة. ❌
2. **Packages/Jalasaat (باقات جلسات) مع رصيد جلسات وخصم باقة** — طلب صريح ومفقود؛ مهم لعيادات الجلدية/الأسنان/العلاج الطبيعي. ❌
3. **Treatment Plans ككيان (حالة + خطوات + طباعة)** — يربط التشخيص بالروشتة والإجراءات. 🟡→❌
4. **Patient rating/feedback post-visit + طلب تقييم تلقائي** — سمعة العيادة = حجوزات؛ مفقود تمامًا. ❌ (من القائمة)
5. **Telehealth video (Twilio/Daily/WebRTC) مربوط بنوع الموعد** — نوع telehealth label فقط؛ الفيديو توصية FEATURE_RESEARCH P1. ❌
6. **Digital intake forms قبل الزيارة (عربي/FHIR Questionnaire)** — الـ Consents موجودة لكن intake طبي كامل مفقود؛ توصية بحث P1. 🟡→❌
7. **Google Calendar sync (OAuth per-doctor)** — طلب صريح ومفقود؛ يقلل no-show. ❌
8. **Report builder + تصدير CSV/XLS + تقارير مجدولة + إيراد per-service/per-procedure** — التقارير الحالية شهرية ثابتة. 🟡
9. **منحنى تطور المريض (vitals trend + outcome)** — الـ Timeline سردي فقط. 🟡
10. **تكامل LIS/PACS أساسي (طلب إلكتروني + نتيجة راجعة)** — الرفع اليدوي لا يكفي لمعامل كبيرة. 🟡
11. **مزامنة حالة حملات WhatsApp (Business templates + إطلاق campaign من draft)** — الحملات عالقة في draft. 🟡

### P2 — تحسين (تميّز)

1. **AI scribe (تفريغ/مسودة SOAP) + AI summary + AI search** — توصية بحث P2؛ قفزة إنتاجية للأطباء. ❌
2. **E-prescribe/pharmacy network** — region-specific؛ توصية بحث P2. ❌
3. **Public marketplace/SEO doctor pages + حجز بدون تسجيل (match-by-phone + caps)** — فقط لو GTM استحواذ B2C (Vezeeta-style)؛ البحث يحذر منه كـ non-goal قريب. ❌
4. **FHIR write-back + مفاتيح API للعيادات + Webhooks خارجية** — القراءة فقط حاليًا. 🟡
5. **تطبيقات native (iOS/Android) + تقييمات ستور** — الـ PWA كافٍ الآن. 🟡
6. **Group appointments/classes + لغات إضافية (FR/UR) + برنامج ولاء** — توصيات بحث P2/خبرة سوق. ❌
7. **Equipment maintenance API (سجل صيانة + تنبيه معايرة)** — الموديل موجود بلا API. 🟡→❌
8. **ملخص مريض قابل للمشاركة (Printable Patient Summary + QR)** — يخدم الإحالات والتأمين. 🟡→❌

---

*الإجمالي التقريبي: الأقسام الـ14 above تعطي الصورة لكل بند — راجع سطر الملخص تحت كل قسم للتفاصيل.*
