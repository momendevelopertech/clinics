# UI Integrity Report — OpenHealthCRM
> تاريخ الفحص: 2026-09-13
> النطاق: كل أزرار الواجهة مقابل الـ APIs الحقيقية + بيانات حية مقابل dummy + responsive (375 / 768 / 1280)
> ملاحظة: منطق F-FLAG1 السريري لم يُلمس (بانتظار توقيع دكتور).

## 1. أزرار بلا أيقونة/tooltip واضح + الفيكس

| الزرار | الملف:سطر | الفيكس |
|---|---|---|
| زر حذف عملية معلقة (أيقونة سلة بلا اسم) | `src/components/pwa/pending-changes.tsx:197` | أُضيف `aria-label` + `title="Remove queued change"` |
| زر X لإغلاق بانر التثبيت (بلا اسم) | `src/components/pwa/install-banner.tsx:55` | أُضيف `aria-label="Dismiss"` |
| زر طي السايدبار وهو مطوي (أيقونة فقط بلا اسم) | `src/components/ui/dashboard-with-collapsible-sidebar.tsx:336` | أُضيف `aria-label` + `title={t("header_collapse")}` |
| زر بحث ميت في التقويم (موجود، بلا onClick، ولا يوجد حقل بحث أصلًا) | `src/components/ui/fullscreen-calendar.tsx:139` | **اتشال** هو والفاصل اليتيم جنبه؛ باقي الأزرار (شهر/اليوم) شغالة |
| باقي الأزرار الأيقونية (~20 موضع: تنقل أسبوع، تنبيهات، ثيم، خطط، أرشفة عيادة...) | متفرقة | سليمة — كلها `aria-label` موجود، لم تُلمس |

## 2. بيانات mock/dummy

| الموضع | الحكم |
|---|---|
| كل صفحات الـ dashboard (~30 صفحة) + البورتال + الحجز + السوبر | **حية** — كلها `fetch` لـ `/api/*`، لا `useState` بمصفوفة تجريبية |
| `appointments/page.tsx:60` — `DEFAULT_PROVIDERS = ["Dr. Jane Smith", ...]` كانت تُحفظ فعلًا عند التعديل | **اتصلّح**: نافذة التعديل تستخدم الآن أسماء الطاقم الحقيقية من `GET /api/staff` (نفس مصدر نافذة الحجز) |
| `help/page.tsx` — أسئلة شائعة ثابتة | مقصود (محتوى توثيقي، لا كيان backend) — لم يُلمس |
| `src/components/landing/*` — mock تسويقية | مقصودة — خارج النطاق |
| `sk_test_dummy` / console email / dummy prisma proxy | dev-fallbacks خادمية معلنة، ليست بيانات واجهة |

## 3. أزرار onClick فاضية أو غير موصولة

| النتيجة | التفاصيل |
|---|---|
| صفر `onClick` فاضي + صفر `console.log` بدل استدعاء في `src/app`/`src/components` | فحص grep كامل |
| كل `fetch` في الواجهة يبدأ بـ `/api/` (~100 موضع) — لا روابط وهمية | ما عدا `lib/ai.ts` (سيرفر→OpenAI/Anthropic) وهو صحيح |
| 5 أزرار معطلة `disabled` بعنوان "قريبًا" في البورتال | مقصودة (فيتشرز معلنة) — `src/app/patient-portal/page.tsx:323-384`، لم تُلمس |

## 4. أكشنات خطيرة بلا تأكيد + الفيكس

أُضيف `window.confirm` (بنفس نمط `rx_deleteConfirm` الموجود) باستخدام مفتاحين عامين جديدين `common_confirmDelete` / `common_confirmAction` (en+ar):

| الأكشن | الملف | النوع |
|---|---|---|
| حذف مصروف | `billing/page.tsx:89` | حذف نهائي |
| حذف نوبة | `staff/page.tsx:165` | حذف نهائي |
| إبطال مفتاح API (لا رجعة — السر يُعرض مرة واحدة) | `integrations/page.tsx:98` | غير قابل للرجوع |
| حذف webhook | `integrations/page.tsx:143` | حذف نهائي |
| حذف قالب سريري | `encounters-workspace.tsx:118` | حذف نهائي |
| حذف حساسية (بيانات طبية) | `patient-allergies-card.tsx:90` | حذف بيانات طبية |
| حذف جدولة تقرير | `report-schedule-card.tsx:73` | حذف نهائي |
| حذف override لعيادة (سوبر) | `super-clinic-detail.tsx:382` | حذف نهائي |
| إلغاء موعد (مريض/طاقم — 3 مواضع) | `patient-portal/page.tsx:142` + `appointments/page.tsx` (موضعان) | يطلق auto-offer للانتظار |
| مسح طابور العمليات الأوفلاين (واحدة/كل) | `pending-changes.tsx:86,93` | إسقاط عمل معلق |
| أرشفة/استعادة مريض | `patient-profile-sheet.tsx:20` | **تُرك عمدًا** — قابل للرجوع بنفس الزرار |

## 5. Responsive Issues Fixed

| المشكلة (375px) | الفيكس | الملف |
|---|---|---|
| السايدبار `hidden` تحت md والهامبرجر بلا أثر — التنقل مستحيل على الموبايل | **درج موبايل جديد** بمكون `Sheet` الموجود: نفس عناصر الـ nav + إغلاق تلقائي عند التنقل؛ يبدأ مغلقًا على الشاشات الصغيرة | `dashboard-with-collapsible-sidebar.tsx` |
| جدول الإيصال وجدول الروشتة (طباعة) بلا scroll على الشاشات الصغيرة | غلاف `overflow-x-auto` + `print:overflow-visible` حتى لا تُقص الطباعة الورقية | `print/receipt/[invoice
...[truncated 2085 chars]