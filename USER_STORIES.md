# USER_STORIES.md — قصص المستخدم (تعكس الفلو الحقيقي بعد الربط)

> كل قصة بصيغة: **بصفتي [Role]، أريد [الهدف]، حتى [السبب]** + Acceptance Criteria مرقمة + تسلسل الـ Handoff + الاستثناءات.
> المرجع التقني بين قوسين (ملف/Route). الحالات: `E2E` = مُختبر حيًا (`TEST_REPORT.md`).

---

## التسلسل الرئيسي الكامل (Sequence — Full Patient Journey)

```
بوابة: حجز (+تذكرة تأكيد) ──→ استقبال: Check-in → طابور اليوم
  ──→ تمريض: Vitals مربوطة بالزيارة ──→ طبيب: يرى Vitals داخل مساحة الكشف
  → تشخيص → روشتة (DB/قالب) → إجراءات/تحاليل → إغلاق يولّد فاتورة تلقائيًا
  ──→ صيدلي: صرف + خصم مخزون + إكمال ──→ محاسب: تحصيل + إيصال
  ──→ بوابة: روشتة + فاتورة + سجل + متابعة مقترحة ──→ مالك: تقارير ──→ سوبر: عزل تام
```

---

## 1) مالك (Owner)

- **O1:** بصفتي مالكًا، أريد لوحة تقارير (إيرادات/أطباء/مخزون/مرضى) بفلترة تاريخ/طبيب/خدمة، حتى أتخذ قرارات تشغيلية.
  - AC1: `GET /api/reports/monthly?month=` يرجع `perDay/perDoctor/perService` + CSV/XLSX (`src/app/api/reports/monthly/route.ts`). `E2E`
  - AC2: `analytics/dashboard` يعرض KPIs (إيراد/مستحق/مصروفات/صافي/تقييم).
  - Handoff: كل إغلاق زيارة ← فاتورة تلقائية (`src/lib/auto-invoice.ts`) ← تظهر في التقارير.
  - استثناء: جدولة التقارير البريدية للمالك فقط؛ SMTP غير مُهيأ → تُسجّل ولا تُرسل.
- **O2:** بصفتي مالكًا، أريد إضافة/تعطيل موظف وتحديد صلاحياته، حتى أتحكم بمن يرى ماذا.
  - AC1: `/staff` (سيرفر-guarded) + `POST /api/staff/roles` (`requireOwner`).
  - AC2: أي تعيين لدور `Super Admin` أو Owner لعيادة أخرى مرفوض سيرفر (لا تصعيد).
  - استثناء: تعطيل موظف لا يحذف سجلاته (التدقيق append-only).

## 2) طبيب (Doctor)

- **D1:** بصفتي طبيبًا، أريد استلام المريض من الطابور بضغطة (بدء الكشف)، حتى لا أبحث يدويًا.
  - AC1: زر "بدء الكشف" في `/queue` ينفذ `call-next` (ينشئ Encounter تلقائيًا idempotent) وينقل لـ `/encounters?appointmentId&patientId` (`src/app/(dashboard)/queue/page.tsx:105`). `E2E`
  - Handoff: Reception(arrived) → call-next(in_progress + Encounter) → Doctor.
  - استثناء: `call-next` على غير `arrived` → 409.
- **D2:** بصفتي طبيبًا، أريد رؤية Vitals الممرضة **داخل** مساحة الكشف قبل التشخيص، حتى أقرر بناءً على بيانات حية.
  - AC1: `EncounterVitalsCard` فوق الـ SOAP لكل زيارة (REST + live SSE) مع empty state موجّه (`src/components/encounters/encounter-vitals-card.tsx`). `E2E` (قراءة ظهرت: 120/80).
  - Handoff: Nurse(`POST /api/vitals {encounterId}`) → Doctor (فوري).
  - استثناء: لا قراءة بعد → رسالة توجيهية + زر تسجيل (لا شاشة فارغة صامتة).
- **D3:** بصفتي طبيبًا، أريد كتابة روشتة من قاعدة أدوية حقيقية وقوالب، حتى لا أكتب نصًا حرًا خاطئًا.
  - AC1: بحث `/api/medications/search` يعرض المخزون (كمية/تحذير نفاد) داخل المؤلف (`src/components/prescriptions/new-prescription-dialog.tsx`). `E2E` (نتيجتان).
  - AC2: 5 قوالب مشتركة + مفضلة لكل دكتور (`scripts/seed-medications.js`) + حفظ/استخدام قالب من المؤلف.
  - AC3: تحذير تعارض حساسية استشاري (لا يمنع) — `src/app/api/prescriptions/route.ts:86`.
  - Handoff: حفظ الروشتة → تظهر للصيدلي (`sentToPharmacy` بعد الصرف) → تُحسب في الفاتورة (بند 0 + تسعير المحاسب) → تظهر للمريض في بوابته.
- **D4:** بصفتي طبيبًا، أريد إغلاق الزيارة فيتولد الحساب تلقائيًا، حتى لا أعتمد على إدخال المحاسب اليدوي.
  - AC1: `PATCH encounters/[id] {completed}` ينشئ فاتورة `sent` (استشارة + إجراءات مسعّرة + بنود صرف) idempotent (`encounter-<id>`) — `src/lib/auto-invoice.ts`. `E2E` (`INV-… 300`).
  - استثناء: الإغلاق لا يفشل أبدًا بسبب الفوترة (try/catch داخلي)؛ إعادة الإغلاق 409.

## 3) استقبال (Reception)

- **R1:** بصفتي استقبالًا، أريد (بحث/تسجيل مريض → اختيار طبيب → تأكيد → Check-in يوم الموعد → طابور)، حتى لا يضيع أي مريض بين الخطوات.
  - AC1: تسجيل بأول/أخير اسم فقط + MRN تلقائي (`POST /api/patients`). `E2E`
  - AC2: حجز بفحص تعارض 409 وتوفر الدكتور (`src/lib/appointments.ts:89`). `E2E`
  - AC3: `check-in` → ظهور فوري في `/queue` (status-driven). `E2E`
  - Handoff: Queue → Nurse (Vitals) → Doctor (بدء الكشف).
  - استثناء: إلغاء/no-show لموعد مستقبلي → عرض تلقائي على الانتظار (`autoOfferFreedSlot`)؛ Check-in لغير اليوم مسموح لكن الظهور يوم الموعد (موثق `TEST_REPORT.md`).
- **R2:** بصفتي استقبالًا، أريد إدارة الحملات والتواصل، حتى أملأ العيادة.
  - AC1: `/campaigns` تعمل للاستقبال (أُصلحت G13: proxy + module).
  - استثناء: الإرسال الفعلي يتطلب Twilio/خطة (فشل مسجّل `failed` لا صامت).

## 4) تمريض (Nurse)

- **N1:** بصفتي ممرضة، أريد استلام المريض من الطابور وتسجيل Vitals مربوطة بالزيارة، حتى يراها الدكتور فورًا.
  - AC1: زر "تسجيل الحيوية" في كل صف طابور (`RecordVitalsDialog` بـ `patientId`) — `src/app/(dashboard)/queue/page.tsx:121`. `E2E` (BMI تلقائي 24.2).
  - AC2: الربط بالزيارة عبر `encounterId` عند وجودها.
  - Handoff: H2 أعلاه.
- **N2:** بصفتي ممرضة، أريد تنفيذ الحقن/التطعيمات المطلوبة وإقفالها من "إجراءات اليوم"، حتى يُسجَّل من نفّذ ماذا.
  - AC1: بطاقة `TodayProceduresCard` في `/queue` (ordered → in_progress → completed) — `src/components/encounters/today-procedures-card.tsx`.
  - AC2: الإقفال يسجّل `performedByRole/UserId` سيرفر (مايجريشن `nurse_procedure_performer`).
  - استثناء: المكتمل/الملغي نهائي (409 عند التغيير).

## 5) صيدلي (Pharmacist)

- **P1:** بصفتي صيدليًا، أريد قائمة روشتات معلقة أصرف منها فيخصم المخزون وتتحدث الحالة والفاتورة، حتى لا أصرف من خارج النظام.
  - AC1: زر "صرف" لكل روشتة `active` يفتح مطابقة المخزون (تلقائية بالاسم + كمية) — `src/components/prescriptions/dispense-dialog.tsx`.
  - AC2: `POST …/dispense` ترانزكشن واحدة: تحقق مخزون (409 عند العجز + تسمية الصنف) + حركات `usage` + `completed + sentToPharmacy=true` + تدقيق — `src/app/api/prescriptions/[id]/dispense/route.ts`. `E2E` (300→298).
  - AC3: تنبيه حد أدنى/نفاد ظاهر في المطابقة (`lowStock/outOfStock`).
  - Handoff: Doctor(Rx) → Pharmacist(صرف) → Biller (بنود الصرف الفعلية في الفاتورة كبنود 0 + تسعير).
  - استثناء: صنف بلا مخزون مطابق → يُسجَّل "بدون خصم" (صيدلية خارجية)؛ الروشتة المكتملة/الملغاة → 409.

## 6) محاسبة (Biller)

- **B1:** بصفتي محاسبًا، أريد فواتير تُولد تلقائيًا عند إغلاق الزيارة (كشف + مصروف فعلي + إجراءات) ثم أحصّل (كامل/جزئي/تأمين) وأصدر إيصالًا، حتى لا أفوّت إيرادًا.
  - AC1: كل إغلاق → فاتورة `sent` (G7). `E2E`
  - AC2: دفع نقدي/تحويل/شيك/تأمين → `completed` فورًا + `resolveInvoiceStatus` (`paid/partially_paid/sent`)؛ بطاقة → Stripe `pending`. `E2E` (`paid 300/300`).
  - AC3: إيصال قابل للطباعة `/print/receipt/[invoiceId]` + تقسيط/كوبون/استرداد.
  - Handoff: Biller → Portal (فاتورته ودفعه) → Owner (تقارير).
  - استثناء: حالات `draft|sent|partially_paid|paid|overdue` تُحسب سيرفر فقط.

## 7) بوابة المريض (Patient Portal)

- **PT1:** بصفتي مريضًا، أريد (تسجيل → حجز → **تذكرة تأكيد واضحة** → متابعة حالة → تذكير) حتى أعرف خطوتي التالية دائمًا.
  - AC1: بعد الحجز تذكرة (الطبيب + الموعد + زر "عرض في بوابتي" + "احجز آخر") — `src/components/booking/book-clinic-client.tsx` (كانت toast فقط).
  - AC2: إلغاء/تعديل للمواعيد المستقبلية فقط (`canPatientCancel/RescheduleAppointment`).
  - AC3: لا مواعيد → تلميح (يوم/طبيب آخر أو الاتصال للانتظار) — `portal_noSlotsHint`.
  - استثناء: past slots لا تظهر أصلًا (`getAvailableSlots`).
- **PT2:** بصفتي مريضًا، أريد بعد الزيارة (روشتتي + فاتورتي + سجل زياراتي + متابعة مقترحة) حتى أتابع علاجي.
  - AC1: بطاقة "روشتاتي" (`GET patient-portal/prescriptions` own-id). `E2E`
  - AC2: "سجل الزيارات" (تشخيصات + متابعات مستحقة + زر حجز متابعة). `E2E`
  - AC3: الفواتير + دفع Stripe + الإيصالات. `E2E`
  - Handoff: كل كتابة سريرية/مالية للطاقم ← تنعكس هنا (لا dead-ends: "سجلاتي" و"ملخصي" يمرران لأقسامهما؛ المراسلة فقط قريبًا ومعلنة).

## 8) سوبر أدمن (Super Admin)

- **S1:** بصفتي سوبر أدمن، أريد إدارة العيادات كـ Tenants (تفعيل/تعطيل/خطط/تجاوزات) دون رؤية بياناتها التشغيلية، حتى أحمي الخصوصية وأدير المنصة.
  - AC1: `/super` (5 أقسام) + `/super/plans` + `/super/clinics/[orgId]` — كلها `requireSuperAdmin` المزدوج. `E2E`
  - AC2: `platform-admin` مستثناة من التعديل سيرفر.
  - AC3: عزل Tenants مُختبر حيًا: عيادة B → مريض عيادة A = **404**؛ كل كويري عيادة مفلترة `organizationId` (أو عبر الأب للجداول المرتبطة) — `TEST_REPORT.md #32`.
  - استثناء: صفحة الديمو 404 إنتاجيًا إلا `ALLOW_DEMO_ACCOUNTS=true` (G15).
