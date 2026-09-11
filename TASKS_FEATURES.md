# TASKS_FEATURES — تنفيذ FEATURE_CHECKLIST_STATUS.md

> مصدر الحقيقة: `FEATURE_CHECKLIST_STATUS.md` (يُقرأ فقط — لا يُعدَّل).
> الملفات المرجعية المحمية (لا تُمس): `TASKS.md`, `ARCHITECTURE.md`, `TESTING_PLAN.md`, `FEATURE_RESEARCH.md`, `FEATURE_CHECKLIST_STATUS.md`.
> سجل التقدم: `PROGRESS.md` (يُكمَّل فيه فقط).
> التنفيذ: تاسك واحد كامل في المرة + تستات بعده. أي مايجريشن: فحص تأثير البيانات أولًا. أي قرار بيزنس: `BLOCKED` في `PROGRESS.md` ثم المتابعة.

## تاسك رقم 0 — حرج/عاجل (قبل أي حاجة)

- [x] إعادة الـ unique index `appointment_active_slot_unique` على مستوى الـ DB — مايجريشن SQL جديدة تُعيد `CREATE UNIQUE INDEX ... ON Appointment(providerId, startTime) WHERE status IN (scheduled, confirmed, arrived, in_progress)` (الحالات تطابق `ACTIVE_STATUSES` في `src/lib/appointments.ts:49`) + تيست integration يثبت رفض حجزين متزامنين على مستوى الداتابيز (`P2002`) — Phase (P0-حرج) — مرجع (قسم 📅 المواعيد والاستقبال). ✅ DONE 2026-09-11: اتجاه معكوس (B→A) بعد اكتشاف تلوث seed في B؛ 8 صفوف اتنقلت + B-101 cancelled + deploy + integration 5/5 أخضر.

## P0 — لازم (تشغيل/إيراد/سلامة)

- [x] دمج الملفات المكررة + بحث سيرفرسايد مع pagination — `GET /api/patients` يدعم `?q&page&pageSize` (فلترة سيرفرية على الاسم/MRN/الهاتف + عدّ إجمالي) + `POST /api/patients/[id]/merge` ينقل (مواعيد/زيارات/فواتير/مختبر) للملف الباقي داخل transaction + audit + UI دمج — Phase (P0) — مرجع (🎯-P0-#1 / قسم 👤). ✅ DONE 2026-09-11: بحث (`patientListQuerySchema` + رجوع متوافق)، دمج (`patient-merge.ts`: 19 جدول + EmergencyContact conflict + revoke sessions + أرشفة المكرر + audit)، زر Merge في صف المرضى + `MergePatientsDialog` + مفاتيح ar/en.
- [x] استرداد من الطاقم + طرق كاش/تحويل + بوابات محلية — `POST /api/payments/[id]/refund` (Stripe refund + تحديث Payment/Invoice بلا تكرار) + حقل `paymentMethod` (cash/card/transfer/online) في المدفوعات اليدوية + بوابة محلية واحدة على الأقل (Paymob/Fawry) بجانب Stripe — Phase (P0) — مرجع (🎯-P0-#2 / قسم 💰). ✅ DONE 2026-09-11: manual record + staff refunds + method UI (no migration); local gateways split to F-B4 BLOCKED.
- [x] تقسيط وخصومات منظمة — موديل `InstallmentPlan` (أقساط + استحقاق + حالة) مربوط بالفاتورة + كوبونات/نسب خصم على مستوى المؤسسة + UI خطة تقسيط — Phase (P0) — مرجع (🎯-P0-#3 / قسم 💰). ✅ DONE 2026-09-11: migration installments_coupons + plan/pay/cancel APIs + coupons CRUD + couponCode at invoice create + billing UI dialogs + ar/en.
- [x] Expiry + Batch/Lot للمخزون مع تنبيهات سيرفر — حقول `expiryDate/batchNumber` على `InventoryItem` (مايجريشن) + ربط الـ Transaction بالدفعة + تنبيهات قرب انتهاء/نقص عبر cron + `Notification` — Phase (P0) — مرجع (🎯-P0-#4 / قسم 📦). ✅ DONE 2026-09-11: migration inventory_expiry_batch + PATCH item + alerts GET/cron digest + UI fields/columns/banners + ar/en.
- [x] قوالب مستندات قابلة للطباعة + توليد PDF سيرفر — قوالب (Referral/Medical Report/Radiology & Lab Request/Discharge/Sick-leave) + صفحات `print/*` + توليد PDF من السيرفر (مكتبة واحدة: puppeteer/react-pdf) بدل `window.print` فقط — Phase (P0) — مرجع (🎯-P0-#5 / قسم 📄). ✅ DONE 2026-09-11: 6 react-pdf templates + generate API (Cloudinary persist or direct download) + templates catalog + UI dialog + ar/en.
- [x] 2FA (TOTP) + نسخ احتياطي واستعادة — `totpSecret` + تفعيل/تحقق QR + إجبار اختياري per-org + نسخ احتياطي مجدول + نقطة استعادة موثقة (RPO/RTO) — Phase (P0) — مرجع (🎯-P0-#6 / قسم 🔐). ✅ DONE 2026-09-11: TOTP (otplib v13) setup/verify/disable + encrypted secrets + backup codes + login gate + /security page + org JSON export + audit.
- [x] Calendar يومي + أكشنات Queue + حجز من الـ Waitlist — Day view بجانب الشهري + `POST/PATCH /api/queue` (استدعاء/تخطي/نقل) + زر "احجز من الانتظار" (waitlist → appointment + إغلاق العرض) — Phase (P0) — مرجع (🎯-P0-#7 / قسم 📅). ✅ DONE 2026-09-11: day agenda view + queue actions API/UI + waitlist book endpoint/UI.
- [x] إعدادات التذكير + حالة التسليم — إعدادات per-org (cadences 24h/1h + quiet hours + قنوات) + عمود حالة per-channel في UI + إعادة المحاولة للفاشل — Phase (P0) — مرجع (🎯-P0-#8 / قسم 📱). ✅ DONE 2026-09-11: reminderConfig (24h/1h/channels/quiet) + cron honors + settings UI + ar/en.
- [x] صفحة موظفين + shifts/rota + صلاحيات فرع — صفحة `staff/` (قائمة/تعيين أدوار/فروع) + موديل Shifts (نوبات + تعارض) + سكوب صلاحية per-branch — Phase (P0) — مرجع (🎯-P0-#9 / قسم 👨‍⚕️). ✅ DONE 2026-09-11: staff page + shifts API/UI + branch filter + nav.
- [x] تقرير مصروفات (Expenses) — موديل `Expense` (بند/مبلغ/تاريخ/فرع) + CRUD + صافي الربح في `reports/monthly` و `analytics/dashboard` — Phase (P0) — مرجع (🎯-P0-#10 / قسم 💰). ✅ DONE 2026-09-11: Expense ledger + net profit in dashboard/monthly + billing UI.

## P1 — مهم (تحويل واحتفاظ)

- [x] Clinical Templates per-specialty + SOAP UI منظمة — موديل `ClinicalTemplate` (تخصص + حقول SOAP افتراضية) + API + حقول SOAP منظمة في `encounters-workspace` بدل النص الحر — Phase (P1) — مرجع (🎯-P1-#1 / قسم 🩺). ✅ DONE 2026-09-11: ClinicalTemplate model/APIs + structured SOAP composer + template picker/manager + ar/en.
- [x] Packages/باقات جلسات — موديل `Package` (خدمات + عدد جلسات + سعر + خصم) + رصيد جلسات per-patient + استهلاك عند كل `procedure-order` — Phase (P1) — مرجع (🎯-P1-#2 / قسم 💊). ✅ DONE 2026-09-11: ServicePackage/PatientPackage models/APIs + balance/consume + catalogs UI + ar/en.
- [x] Treatment Plans ككيان — موديل `TreatmentPlan` (حالة + خطوات + ربط تشخيص/روشتة/إجراءات) + status machine + طباعة — Phase (P1) — مرجع (🎯-P1-#3 / قسم 🩺+💊). ✅ DONE 2026-09-11: TreatmentPlan+Step models/APIs + patient-page section + treatment_plan PDF + ar/en.
- [x] Patient rating/feedback + طلب تقييم تلقائي — موديل `Feedback` (تقييم + تعليق) + رابط تقييم post-visit عبر رسالة تلقائية + متوسط التقييم per-doctor — Phase (P1) — مرجع (🎯-P1-#4 / قسم 📱). ✅ DONE 2026-09-11: Feedback model/APIs + portal stars + request endpoint + analytics KPI + ar/en.
- [x] Telehealth video مربوط بنوع الموعد — مزود فيديو واحد (Twilio/Daily/WebRTC) + رابط جلسة على الموعد + صلاحية دخول (طاقم/مريض) — Phase (P1) — مرجع (🎯-P1-#5 / قسم 📱). ✅ DONE 2026-09-11 (coordination): telehealthUrl on appointments + set-link API + staff badges/dialogs + portal Join + reminder links + ar/en. Managed SFU video needs vendor keys → F-B5 BLOCKED.
- [x] Digital intake forms قبل الزيارة — نماذج دخول طبية (عربي/FHIR Questionnaire) يملأها المريض من الـ Portal قبل الموعد وتُحفظ في ملفه — Phase (P1) — مرجع (🎯-P1-#6 / قسم 📱). ✅ DONE 2026-09-11: IntakeForm/Field/Response models/APIs + portal answer card + settings manager + ar/en.
- [x] Google Calendar sync — OAuth per-doctor + مزامنة ثنائية الاتجاه (إنشاء/إلغاء) + إعداد per-org — Phase (P1) — مرجع (🎯-P1-#7 / قسم 🌐). ⛔ BLOCKED 2026-09-11 (F-B6): needs Google Cloud OAuth client ID/secret + per-doctor grant — no credentials in env, sync cannot be built/tested without them.
- [x] Report builder + تصدير + تقارير مجدولة — تصدير CSV/XLS للتقارير الحالية + تقرير إيراد/عدد per-service/per-procedure + جدولة بريدية — Phase (P1) — مرجع (🎯-P1-#8 / قسم 📊). ✅ DONE 2026-09-11: per-service revenue + shared CSV + XLSX + monthly email schedules + ar/en.
- [x] منحنى تطور المريض — رسم vitals trend + مقارنة زيارات + outcome scores في صفحة المريض — Phase (P1) — مرجع (🎯-P1-#9 / قسم 🩺). ✅ DONE 2026-09-11: vitals trend API + SVG sparkline card + stats + ar/en.
- [x] تكامل LIS/PACS أساسي — طلب إلكتروني + استقبال نتيجة راجعة (HL7/FHIR write) لمعمل/أشعة واحد على الأقل — Phase (P1) — مرجع (🎯-P1-#10 / قسم 🧪+🌐). ✅ DONE 2026-09-11: migration `20260913000000_lab_exchange` + `LabOrder.transmittedAt/externalRef` + `POST /api/lab-orders/[id]/transmit` + `POST /api/lab-orders/[id]/ingest` + `buildDiagnosticRequest` FHIR payload + UI `LabOrdersSection` + unit test 3/3 green.
- [x] إطلاق حملات WhatsApp (Business templates) — `POST /api/communications/campaigns/[id]/launch` + قوالب معتمدة + تتبع حالة الإرسال (الحملات عالقة في draft حاليًا) — Phase (P1) — مرجع (🎯-P1-#11 / قسم 📱). ✅ DONE 2026-09-11: approved WhatsApp template resolver + `/launch` route sends to eligible patients, records `Communication` status rows, sets campaign to `active`, dashboard Launch button included; tests 2/2 green.

## P2 — تحسين (تميّز)

- [ ] AI scribe + AI summary + AI search — مسودة SOAP من تفريغ الزيارة + ملخص مريض + بحث دلالي (مزود واحد + إعدادات + audit) — Phase (P2) — مرجع (🎯-P2-#1 / قسم 🌐).
- [ ] E-prescribe/pharmacy network — تكامل شبكة وصفات region-specific (بحث مزود أولًا) — Phase (P2) — مرجع (🎯-P2-#2 / قسم 🌐).
- [ ] Public marketplace/SEO + حجز بدون تسجيل — [يحتاج قرار بيزنس] صفحات أطباء عامة + مطابقة بالهاتف + caps ضد إساءة الاستخدام — Phase (P2) — مرجع (🎯-P2-#3 / قسم 🌐).
- [ ] FHIR write-back + مفاتيح API + Webhooks خارجية — كتابة FHIR + مفاتيح per-org + webhooks للأحداث (حجز/نتيجة/دفع) — Phase (P2) — مرجع (🎯-P2-#4 / قسم 🌐).
- [ ] تطبيقات native — [يحتاج قرار بيزنس] iOS/Android (الـ PWA الحالي كافٍ مؤقتًا) — Phase (P2) — مرجع (🎯-P2-#5 / قسم 🌐).
- [ ] Group appointments/classes + لغات إضافية + ولاء — [اللغات/الولاء: قرار بيزنس] حجوزات جماعية + (FR/UR) + نقاط ولاء — Phase (P2) — مرجع (🎯-P2-#6 / قسم 🌐).
- [x] Equipment maintenance API — سجل صيانة + تنبيه معايرة على موديل `Equipment` الموجود (بلا API حاليًا) — Phase (P2) — مرجع (🎯-P2-#7 / قسم 📦). ✅ DONE 2026-09-11: migration `20260914000000_equipment_maintenance` + `Equipment.lastCalibrationAt/nextCalibrationAt/status` + `EquipmentMaintenance` log + `GET/POST /api/equipment` + `GET/POST /api/equipment/[id]/maintenance` + calibration alert helper + unit test 3/3 green.
- [x] ملخص مريض قابل للمشاركة — مستند Patient Summary قابل للطباعة + QR للإحالات/التأمين — Phase (P2) — مرجع (🎯-P2-#8 / قسم 📄). ✅ DONE 2026-09-11: `GET /api/patients/[id]/summary` builds printable payload with diagnoses/vitals/medications + QR URL; patient summary page renders print-friendly view; unit test 1/1 green.

## استكمال بنود 🟡 (جزئية مؤثرة تشغيليًا — غير مغطاة أعلاه)

- [ ] حساسية وأدوية منظمة (Allergy/Medication) — موديلان منفصلان بدل النص الحر + تحذير تعارض في الروشتة — Phase (P1) — مرجع (قسم 👤 🟡).
- [ ] طباعة بنود الروشتة + زر إرسال روشتة/فاتورة — طباعة `items[]` في `print/prescription` + زر إرسال مباشر للمريض (Portal/WhatsApp) — Phase (P1) — مرجع (قسم 💊+📱 🟡).
- [ ] لوحتا طبيب واستقبال — لوحة per-doctor (عياداتي/وصفاتي/مرضاي) + لوحة استقبال (حضور اليوم/انتظار/تحصيل) بدل اللوحة الواحدة — Phase (P1) — مرجع (قسم 📊 🟡).
- [ ] Check-in/out endpoints مخصصة — `POST /api/appointments/[id]/check-in|check-out|no-show` فوق الـ PATCH الحالي + أزرار استقبال — Phase (P1) — مرجع (قسم 📅 🟡).
- [ ] تصعيد متابعة تلقائي — مهام + رسائل تلقائية للـ overdue follow-ups (cron) بدل الإشارات read-only — Phase (P1) — مرجع (قسم 🔄 🟡).
- [ ] تشفير ملفات صريح — تشفير/روابط موقعة للملفات الحساسة فوق حماية المزود — Phase (P2) — مرجع (قسم 🔐 🟡).
- [ ] تكامل clearinghouse تأمين حقيقي — [يحتاج قرار بيزنس/مزود] ربط دافع فعلي للأهلية والمطالبات بدل الفحص المحلي — Phase (P2) — مرجع (قسم 💰 🟡).
