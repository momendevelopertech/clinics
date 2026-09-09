# خطة الخطوات التالية وجاهزية الإنتاج — OpenHealthCRM

> تاريخ المراجعة: 09 سبتمبر 2026
> منظور المراجعة: مدير المشروع ومسؤول الإنتاج والتسليم للعميل
> نطاق المراجعة: ملفات المشروع، التوثيق، الصلاحيات، المصادقة، النشر، الاختبارات، وقابلية التشغيل.

## 1. الخلاصة التنفيذية

المشروع قوي كـ **Demo / Staging**، لكنه غير جاهز حاليًا كتسليم Production للعميل بدون إغلاق بعض المخاطر المهمة.

أهم ملاحظة: بعض المستندات، خصوصًا `FINAL_REVIEW_REPORT.md` و`QUICK_START_DEPLOYMENT.md`، تعطي انطباعًا أن المشروع جاهز للنشر بالكامل، بينما `README.md` ونتيجة مراجعة الكود توضح وجود مخاطر تشغيل وأمان حقيقية.

## 2. الأولوية الأولى: إغلاق مخاطر الأمان

### 2.1 حماية جلسات المرضى

حاليًا تسجيل دخول المريض وإنشاء الجلسة لا يتحققان بشكل واضح من حالة المؤسسة:

- `src/app/api/patient-auth/login/route.ts`
- `src/lib/patient-auth.ts`

المطلوب:

- منع دخول مرضى المؤسسة المعلقة أو غير النشطة.
- رفض الجلسات القديمة بعد تعليق المؤسسة.
- إضافة اختبار للجلسات بعد `revokedAt` وبعد انتهاء الصلاحية.

### 2.2 فرض التشفير في Production

التشفير حاليًا اختياري إذا لم يوجد `ENCRYPTION_KEY`:

- `src/lib/crypto.ts`

المطلوب:

- إجبار وجود `ENCRYPTION_KEY` في بيئة الإنتاج.
- منع التشغيل أو إصدار تحذير قاتل إذا كان المفتاح ناقصًا.
- توثيق تدوير المفتاح والنسخ الاحتياطي له.
- اختبار أن البيانات الحساسة لا تُحفظ بصيغة plaintext في Production.

### 2.3 إلغاء الإعدادات غير الآمنة في Docker

الملف `docker-compose.yml` يحتوي على:

- `NEXTAUTH_SECRET: change-me-before-production`
- `SEED_DEMO_DATA: "true"`
- بيانات PostgreSQL افتراضية.
- فتح منافذ PostgreSQL وRedis للعالم الخارجي محليًا.

المطلوب:

- جعل القيم تأتي من `.env`.
- جعل `SEED_DEMO_DATA=false` افتراضيًا.
- عدم استخدام Docker Compose الحالي كملف Production.
- إنشاء ملف منفصل مثل `docker-compose.production.yml` أو توثيق deployment آمن.

### 2.4 استبدال Rate Limiting المحلي

الـ rate limit الحالي يعتمد على `Map` داخل نفس Process:

- `src/lib/rate-limit.ts`

هذا لا يكفي مع Vercel أو أكثر من server replica.

المطلوب:

- استخدام Redis الموجود في المشروع أو Rate Limit provider.
- اختبار rate limit عبر أكثر من instance.
- إضافة حماية واضحة للـ login وsignup وpatient login وwebhooks.

## 3. الأولوية الثانية: جعل النشر قابلًا للتشغيل فعليًا

### 3.1 تفعيل Cron Jobs

يوجد cron logic، لكن `vercel.json` لا يحتوي على cron configuration.

المطلوب:

- إضافة Vercel Cron أو scheduler خارجي.
- حماية cron بـ `CRON_SECRET`.
- تسجيل نجاح وفشل كل job.
- منع التكرار عند إعادة تشغيل job.
- اختبار appointment reminders وscheduled communications.

### 3.2 إضافة Health وReadiness Checks

لا يوجد مسار واضح مثل:

- `/api/health`
- `/api/readiness`

المطلوب:

- Health check للتطبيق.
- Readiness check لقاعدة البيانات وRedis.
- عدم كشف أسرار أو تفاصيل داخلية في response.
- استخدام هذه المسارات في deployment monitoring.

### 3.3 إضافة خطة تشغيل حقيقية

قبل التسليم يجب توثيق:

- Backup وrestore لقاعدة البيانات.
- Secret rotation.
- Error monitoring.
- Alerting.
- Log retention.
- Data retention.
- Incident response.
- Rollback procedure.
- Database migration procedure.

## 4. الأولوية الثالثة: اختبارات الإنتاج

الاختبارات الحالية أغلبها Unit Tests داخل `tests/unit`. المطلوب إضافة Integration وE2E.

### الاختبارات الضرورية

1. **Tenant isolation**
   - مستخدم من Clinic A لا يرى بيانات Clinic B.

2. **Role matrix**
   - كل دور.
   - كل route مهم.
   - قراءة وكتابة.
   - الحالات المتوقعة `401` و`403`.

3. **Patient sessions**
   - المؤسسة المعلقة.
   - session revoked.
   - session expired.
   - patient من مؤسسة أخرى.

4. **Super Admin**
   - الوصول إلى `/super`.
   - منع مستخدم عادي من `/api/super/*`.

5. **Billing وStripe**
   - webhook signature.
   - duplicate events.
   - refunds.
   - payment failures.

6. **Entitlements**
   - Free / Clinic / Plus.
   - تجاوز limits.
   - module locked.
   - override من Super Admin.

7. **Cron**
   - authentication.
   - duplicate execution.
   - retry behavior.

8. **Migration**
   - تشغيل migrations على PostgreSQL جديد تمامًا.
   - تشغيل seed في بيئة نظيفة.

## 5. الأولوية الرابعة: توحيد التوثيق

### المشاكل المطلوب إصلاحها

- `FINAL_REVIEW_REPORT.md` يحتوي أرقامًا قديمة للصفحات والـ API والاختبارات.
- `QUICK_START_DEPLOYMENT.md` يصف المشروع كأنه جاهز للإنتاج خلال 2 إلى 4 ساعات، وهذا متفائل وغير دقيق.
- الملف يوصي بـ `npm audit fix` بشكل مباشر، وهذا قد يسبب تغييرات غير محسوبة.
- يوجد رابط إلى `DEPLOYMENT_CHECKLIST.md` لكنه غير موجود.
- `README.md` يحتوي روابط Docs غير موجودة حاليًا.
- يوجد تعارض بين:
  - "المشروع كامل وقابل للنشر"
  - وكونه غير HIPAA-ready
  - ووجود security gaps وmissing production operations.

### المطلوب

- تحديث `FINAL_REVIEW_REPORT.md`.
- إعادة تسمية `QUICK_START_DEPLOYMENT.md` إلى Demo/Staging Deployment Guide أو تعديل محتواه.
- إنشاء `DEPLOYMENT_CHECKLIST.md`.
- إصلاح الروابط المكسورة في README.
- اعتماد `ROLE_CAPABILITY_GUIDE.md` كمصدر الصلاحيات.
- إبقاء `USER_FLOWS.md` و`USER_FLOWS_AR.md` متوافقين معه.

## 6. الأولوية الخامسة: فجوات المنتج

هذه ليست أخطاء أمنية، لكنها يجب أن تكون واضحة للعميل:

- `P4-T3`، سياسة توليد الرسوم، ما زالت تحتاج قرارًا تجاريًا.
- لا توجد صفحة مستقلة كاملة لـ Prescriptions.
- لا توجد صفحة مستقلة لـ Insurance Claims.
- لا توجد وحدة Feedback/Surveys.
- بعض وظائف Patient Portal ما زالت `coming soon`.
- صفحة Help جزئية، وإرسال الدعم ليس workflow كاملًا.
- بعض الصفحات تعرض للمستخدم لكن عمليات الكتابة قد تفشل بـ `403` بدون تجربة Read-only واضحة.
- Dashboard واحدة عامة وليست Dashboard متخصصة لكل Role.
- توجد صفحات تحتوي على نصوص إنجليزية ثابتة رغم وجود نظام ترجمة.

## 7. ترتيب التنفيذ المقترح

### Sprint 1: Security Gate

- Patient organization status.
- Production encryption requirement.
- Docker secrets/demo seed cleanup.
- Distributed rate limiting.
- Tests للـ tenant isolation والجلسات.

### Sprint 2: Production Operations

- Cron configuration.
- Health/readiness endpoints.
- Monitoring and alerting.
- Backup/restore runbook.
- Deployment and rollback documentation.

### Sprint 3: Authorization QA

- Role-by-role route matrix.
- Read/write integration tests.
- Read-only and forbidden UI states.
- مراجعة Receptionist/Care Coordinator في كل النظام.

### Sprint 4: Documentation and Client Handoff

- تحديث التقارير القديمة.
- إنشاء Deployment Checklist.
- إصلاح الروابط.
- توثيق Known Limitations.
- تجهيز Demo accounts وtest scenarios.

### Sprint 5: Product Decisions

- اعتماد سياسة Charge Generation.
- تحديد هل نكمل Claims وSurveys.
- تحديد وظائف Patient Portal القادمة.
- تحديد هل نحتاج Role-specific Dashboards.

## 8. حالة الملفات الحالية

يوجد حاليًا تغييرات محلية غير مرفوعة:

- `USER_FLOWS.md`
- `USER_FLOWS_AR.md`
- `USER_FLOWS_REVIEW_REPORT.md`

هذه التغييرات تحتاج commit وpush بعد المراجعة.

## 9. القرار الإداري

المشروع الآن:

- مناسب للعرض والتجربة الداخلية.
- مناسب لعمل Demo للعميل.
- غير مناسب لتسليم Production نهائي قبل إغلاق بنود الأمان والتشغيل والاختبارات المذكورة أعلاه.

أول خطوة عملية موصى بها هي إغلاق مخاطر جلسات المرضى، التشفير، Docker، وRate Limiting، ثم تشغيل اختبارات Integration قبل أي نشر للعميل.
