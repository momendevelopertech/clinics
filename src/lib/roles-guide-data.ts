/** Roles Guide data — single source for the /roles-guide page and user-stories-by-role.md.
 * Every task traces to a real button/route/component (see cited paths in text).
 *
 * IMPORTANT (build): this file is imported by a CLIENT component, so it must
 * stay free of server-only imports (prisma/pg). The module lists below are a
 * frozen mirror of src/lib/permissions.ts (CLINIC_MODULES + ROLE_MODULE_ACCESS);
 * tests/unit/roles-guide.test.ts asserts deep parity so truth stays in one place.
 */

const GUIDE_CLINIC_MODULES = [
  "dashboard",
  "patients",
  "appointments",
  "queue",
  "encounters",
  "analytics",
  "consents",
  "audit",
  "labs",
  "tasks",
  "documents",
  "reports",
  "availability",
  "catalogs",
  "communications",
  "locations",
  "waitlist",
  "billing",
  "payments",
  "inventory",
  "automation",
  "campaigns",
  "settings",
  "plan",
  "help",
] as const;

const GUIDE_ROLE_MODULE_ACCESS: Record<string, readonly string[]> = {
  Owner: GUIDE_CLINIC_MODULES,
  Doctor: [
    "dashboard", "patients", "appointments", "queue", "encounters", "analytics",
    "consents", "audit", "labs", "tasks", "documents", "reports", "availability",
    "catalogs", "automation", "help",
  ],
  "Care Coordinator": [
    "dashboard", "patients", "appointments", "queue", "consents", "tasks",
    "documents", "communications", "campaigns", "locations", "waitlist", "help",
  ],
  Nurse: [
    "dashboard", "patients", "appointments", "queue", "encounters", "analytics", "consents",
    "labs", "inventory", "tasks", "documents", "reports", "availability", "catalogs",
    "automation", "help",
  ],
  Biller: [
    "dashboard", "patients", "appointments", "analytics", "audit", "billing",
    "payments", "tasks", "reports", "help",
  ],
  Pharmacist: [
    "dashboard", "patients", "appointments", "labs", "inventory", "tasks",
    "catalogs", "help",
  ],
};

export type LText = { ar: string; en: string };
const t = (ar: string, en: string): LText => ({ ar, en });

export type GuideTask = {
  id: string;
  icon: string;
  title: LText;
  where: LText;
  steps: LText[];
  backend: LText;
  result: LText;
};

export type GuideRole = {
  id: string;
  icon: string;
  name: LText;
  profile: LText;
  landing: LText;
  moduleSource: "rbac" | "custom";
  roleKey?: string;
  customModules?: { key: string; label: LText }[];
  tasks: GuideTask[];
  boundaries: LText[];
};

export function getRoleModules(role: GuideRole): { key: string; available: boolean }[] {
  if (role.moduleSource === "rbac" && role.roleKey) {
    const allowed = new Set<string>(GUIDE_ROLE_MODULE_ACCESS[role.roleKey] ?? []);
    return [...GUIDE_CLINIC_MODULES].map((key) => ({ key, available: allowed.has(key) }));
  }
  return (role.customModules ?? []).map((m) => ({ key: m.key, available: true }));
}

export const ROLES_GUIDE: GuideRole[] = [
  {
    id: "owner",
    icon: "Crown",
    name: t("المالك (Owner)", "Owner"),
    profile: t(
      "صاحب العيادة ومديرها العام. يملك كل الصلاحيات داخل مؤسسته: الإعدادات، الطاقم، الخطط، التكاملات، وتصدير البيانات. لا يصل لمنصة السوبر أدمن.",
      "Clinic owner and general manager. Holds every permission inside their organization: settings, staff, plans, integrations, data export. Cannot reach the Super Admin platform.",
    ),
    landing: t(
      "لوحة /dashboard العامة (care-board): بطل يومي، مؤشرات (مرضى/مواعيد/إيراد/مستحق)، نشاط أخير، مواعيد قادمة، أحدث المرضى — src/app/(dashboard)/dashboard/page.tsx.",
      "General /dashboard care-board: daily hero, KPIs (patients/appointments/revenue/outstanding), recent activity, upcoming appointments, recent patients — src/app/(dashboard)/dashboard/page.tsx.",
    ),
    moduleSource: "rbac",
    roleKey: "Owner",
    tasks: [
      {
        id: "owner-settings",
        icon: "Settings",
        title: t("تعديل إعدادات العيادة واللوجو", "Edit clinic settings and logo"),
        where: t("صفحة /settings — زرار Save (settings_saveChanges)", "Page /settings — Save button (settings_saveChanges)"),
        steps: [
          t("يفتح /settings ويختار القسم (عام/فوترة/فريق/تنبيهات/نماذج دخول).", "Opens /settings and picks a section (general/billing/team/notifications/intake)."),
          t("يعدل الحقول: مدة الموعد، أوقات العمل، العملة، الضريبة، بادئة الفواتير، التذكيرات (24h/1h والقنوات وquiet hours)، سياسة الإلغاء.", "Edits fields: appointment duration, working hours, currency, tax, invoice prefix, reminders (24h/1h, channels, quiet hours), cancellation policy."),
          t("لتغيير اللوجو: CloudinaryImageUpload (purpose=clinic_logo) ثم Save لحفظ clinicLogoUrl.", "For the logo: CloudinaryImageUpload (purpose=clinic_logo), then Save to persist clinicLogoUrl."),
          t("يدوس Save فينفذ PATCH /api/settings.", "Clicks Save, firing PATCH /api/settings."),
        ],
        backend: t("فحص requireOwner ثم Zod (src/lib/validations/settings.ts) ثم حفظ settingsJson والعملة، حذف اللوجو القديم best-effort، وكتابة audit UPDATE OrganizationSettings.", "requireOwner check, Zod validation (src/lib/validations/settings.ts), settingsJson+currency persist, best-effort old-logo cleanup, audit UPDATE OrganizationSettings."),
        result: t("نفس الصفحة + toast settings_saved. ملاحظة: اسم/عنوان العيادة عرض فقط ولا يُحفظ.", "Same page + settings_saved toast. Note: clinic name/address inputs are display-only."),
      },
      {
        id: "owner-staff-roles",
        icon: "Users",
        title: t("إدارة الطاقم وإسناد الأدوار", "Manage staff and assign roles"),
        where: t("صفحة /staff — زرار staff_assignRole ثم staff_assign", "Page /staff — staff_assignRole button, then staff_assign"),
        steps: [
          t("يفتح /staff ويرى الدليل (الأدوار ظاهرة لكل عضو).", "Opens /staff and reviews the directory (roles shown inline)."),
          t("يدوس staff_assignRole فيفتح حوار اختيار العضو (staff_member) والدور (staff_role).", "Clicks staff_assignRole to open the member (staff_member) + role (staff_role) dialog."),
          t("يدوس staff_assign فينفذ POST /api/staff/roles بالـ {userId, roleId}.", "Clicks staff_assign, firing POST /api/staff/roles with {userId, roleId}."),
          t("لتعديل بيانات تشغيلية (تخصص/فرع/غرفة/توفر): PATCH /api/staff بالـ {userId, profile}.", "For operational profile (specialty/branch/room/availability): PATCH /api/staff with {userId, profile}."),
        ],
        backend: t("فحص requireOwner لمسارات الكتابة، UserRole.upsert، وتدقيق UPDATE staff_role / staff_operational_profile.", "requireOwner on write paths, UserRole.upsert, audit UPDATE staff_role / staff_operational_profile."),
        result: t("الدور الجديد يظهر جنب العضو في الدليل فورًا.", "New role appears next to the member in the directory."),
      },
      {
        id: "owner-shifts",
        icon: "CalendarDays",
        title: t("إدارة نوبات الطاقم (rota)", "Manage staff shifts (rota)"),
        where: t("صفحة /staff — بطاقة النوبات: حقول staff_weekday/from/to/branch وزرار staff_addShift", "Page /staff — shifts card: staff_weekday/from/to/branch fields and staff_addShift button"),
        steps: [
          t("يختار العضو ثم يوم الأسبوع (0-6) ووقت البدء والنهاية والفرع.", "Selects the member, weekday (0-6), start/end times, branch."),
          t("يدوس staff_addShift فينفذ POST /api/shifts بالـ {userId, branchId?, weekday, startTime, endTime, note?}.", "Clicks staff_addShift, firing POST /api/shifts with {userId, branchId?, weekday, startTime, endTime, note?}."),
          t("للحذف: common_delete بتأكيد common_confirmDelete فينفذ DELETE /api/shifts/[id].", "To delete: common_delete with common_confirmDelete confirm fires DELETE /api/shifts/[id]."),
        ],
        backend: t("فحص requireOwner، معاملة SERIALIZABLE ترفض التداخل (409 Shift overlaps)، وتدقيق DELETE Shift.", "requireOwner check, SERIALIZABLE transaction rejects overlaps (409 Shift overlaps), audit DELETE Shift."),
        result: t("قائمة النوبات تتحدث فورًا.", "Shift list refreshes immediately."),
      },
      {
        id: "owner-plan",
        icon: "CreditCard",
        title: t("عرض الخطة وطلب ترقية", "View plan and request upgrade"),
        where: t("صفحة /plan — زرار plan_upgrade (للمالك فقط)", "Page /plan — plan_upgrade button (Owner only)"),
        steps: [
          t("يفتح /plan فيرى الخطة الحالية والمزايا (PlanDashboard عبر GET /api/plan/entitlements).", "Opens /plan to see the current plan and entitlements (PlanDashboard via GET /api/plan/entitlements)."),
          t("يدوس plan_upgrade مع ملاحظة اختيارية فينفذ POST /api/org/request-upgrade بالـ {plan, note}.", "Clicks plan_upgrade with optional note, firing POST /api/org/request-upgrade with {plan, note}."),
        ],
        backend: t("فحص requireOwner، رفض نفس الخطة، حفظ upgradeRequestedPlan/At/Note، وتدقيق UPDATE organization_plan_upgrade_request.", "requireOwner check, same-plan rejection, upgradeRequestedPlan/At/Note persist, audit UPDATE organization_plan_upgrade_request."),
        result: t("بانر plan_upgradeRequested في /plan، والطلب يظهر في طابور موافقات السوبر.", "plan_upgradeRequested banner in /plan; request lands in Super approvals queue."),
      },
      {
        id: "owner-integrations",
        icon: "Plug",
        title: t("مفاتيح API والـ webhooks", "API keys and webhooks"),
        where: t("صفحة /integrations — حقول int_keyName وint_hookUrl وأزرار common_add وint_revoke وint_copy", "Page /integrations — int_keyName/int_hookUrl fields, common_add, int_revoke, int_copy buttons"),
        steps: [
          t("لإنشاء مفتاح: يكتب الاسم ويدوس common_add فينفذ POST /api/api-keys بالـ {name, scopes:[fhir:write]}.", "To create a key: types the name, clicks common_add, firing POST /api/api-keys with {name, scopes:[fhir:write]}."),
          t("ينسخ المفتاح فورًا (int_copy) — يظهر مرة واحدة فقط.", "Copies the key at once (int_copy) — shown only once."),
          t("للإبطال: int_revoke بتأكيد فينفذ POST /api/api-keys/[id]/revoke.", "To revoke: int_revoke with confirm fires POST /api/api-keys/[id]/revoke."),
          t("لـ webhook: يدخل الرابط ويختار الأحداث ويدوس common_add فينفذ POST /api/webhooks بالـ {url, eventTypes}.", "For webhooks: enters URL, picks events, clicks common_add, firing POST /api/webhooks with {url, eventTypes}."),
          t("للإيقاف/الحذف: int_pause/int_resume (PATCH) وcommon_delete (DELETE) بتأكيد.", "To pause/delete: int_pause/int_resume (PATCH) and common_delete (DELETE) with confirm."),
        ],
        backend: t("كل الأكشنات requireOwner، توليد سر عشوائي مشفر، توقيع HMAC وإعادة محاولة 3 مرات، وتدقيق CREATE/UPDATE/DELETE لكل عملية.", "Every action requireOwner-guarded; random encrypted secret; HMAC signing with 3 retries; audit on all mutations."),
        result: t("جداول المفاتيح والـ webhooks تتحدث عبر loadAll، وحالة FHIR تظهر عبر بانر.", "Key/webhook tables refresh via loadAll; FHIR status shows in banner."),
      },
      {
        id: "owner-export",
        icon: "Download",
        title: t("تصدير نسخة بيانات المؤسسة", "Export organization data snapshot"),
        where: t("صفحة /security — بطاقة sec_export وزرار sec_exportBtn (Download)", "Page /security — sec_export card with sec_exportBtn (Download)"),
        steps: [
          t("يفتح /security ويدوس sec_exportBtn فينفذ GET /api/org/export.", "Opens /security, clicks sec_exportBtn, firing GET /api/org/export."),
          t("يستلم ملف clinic-backup-<date>.json (بدون blobs — الاسترجاع الحي عبر Neon PITR).", "Receives clinic-backup-<date>.json (no blobs — live restore is Neon PITR)."),
        ],
        backend: t("فحص requireOwner، بناء لقطة محدودة + sha256، وتدقيق EXPORT Organization مباشر.", "requireOwner check, capped snapshot + sha256 build, direct EXPORT Organization audit."),
        result: t("تحميل الملف فورًا، أو toast sec_exportError عند 403.", "Immediate file download, or sec_exportError toast on 403."),
      },
      {
        id: "owner-branches",
        icon: "Building2",
        title: t("الفروع والغرف (إنشاء للمالك فقط)", "Branches and rooms (Owner-only creation)"),
        where: t("صفحة /locations — حقول locations_branchName وlocations_roomName/roomNumber وأزرار common_add", "Page /locations — locations_branchName and locations_roomName/roomNumber fields with common_add buttons"),
        steps: [
          t("يكتب اسم الفرع ويدوس common_add فينفذ POST /api/branches بالـ {name}.", "Types branch name, clicks common_add, firing POST /api/branches with {name}."),
          t("يكتب اسم/رقم الغرفة ويدوس Add فينفذ POST /api/rooms بالـ {name, number}.", "Types room name/number, clicks Add, firing POST /api/rooms with {name, number}."),
        ],
        backend: t("الكتابة requireOwner (وإلا 403 وtoast locations_saveError)، مع Zod (src/lib/validations/location.ts) وتدقيق CREATE branch/room.", "Writes are requireOwner (else 403 + locations_saveError toast), Zod-validated (src/lib/validations/location.ts), audited CREATE branch/room."),
        result: t("القوائم تتحدث. ملاحظة: الصفحة تظهر للاستقبال لكن الإضافة تفشل عندهم (403).", "Lists refresh. Note: Receptionists see the page but their adds fail (403)."),
      },
      {
        id: "owner-catalogs",
        icon: "ClipboardList",
        title: t("كتالوج الخدمات والأكواد السريرية", "Service and clinical catalogs"),
        where: t("صفحة /catalogs — عرض خدمي/سريري مع بحث (القراءة للطواقم، الكتابة للمالك عبر API)", "Page /catalogs — service/clinical lists with search (reads for crews, Owner writes via API)"),
        steps: [
          t("يفتح /catalogs ويرى الخدمات (code·name + price) والأكواد السريرية.", "Opens /catalogs to browse services (code·name + price) and clinical codes."),
          t("الإنشاء/التعديل للمالك عبر POST /api/catalogs?kind= بكتالوج Zod.", "Create/edit is Owner-only via POST /api/catalogs?kind= with catalog Zod schemas."),
        ],
        backend: t("القراءة بموديول catalogs، الكتابة requireOwner، وتدقيق CREATE catalog.", "Reads need catalogs module, writes requireOwner, audit CREATE catalog."),
        result: t("الأسعار والأكواد الجديدة تُستخدم في الفواتير والأوامر.", "New prices/codes flow into invoices and orders."),
      },
    ],
    boundaries: [
      t("لا يصل لمنصة السوبر (/super و/apisuper/* تتطلب Super Admin + user.role=superAdmin).", "Cannot reach the Super platform (/super and /api/super/* require Super Admin + user.role=superAdmin)."),
      t("لا يرى مركز Pending Services (سوبر فقط) — أقرب بديل له بانر FHIR في /integrations.", "Cannot see Pending Services center (Super-only) — closest equivalent is the FHIR banner in /integrations."),
      t("لا ينشئ كوبونات من الواجهة (API فقط) ولا جداول رواتب — غير موجودة.", "Cannot create coupons from UI (API-only) and no payroll exists."),
    ],
  },
  {
    id: "super-admin",
    icon: "ShieldCheck",
    name: t("السوبر أدمن (Super Admin)", "Super Admin"),
    profile: t(
      "حساب المنصة خارج أي مؤسسة (platform-admin). يدير العيادات والخطط والموافقات والتدقيق وإعدادات المنصة ومركز الخدمات. لا يرى مساحة العيادة إطلاقًا (proxy يحوّله لـ /super).",
      "Platform account outside any organization (platform-admin). Manages clinics, plans, approvals, audit, platform settings, services center. Never sees clinic workspace (proxy forces /super).",
    ),
    landing: t(
      "لوحة /super: تبويبات المؤسسات والموافقات والفوترة والتدقيق والخدمات والإعدادات — src/app/super/page.tsx (requireSuperAdmin وإلا /login).",
      "The /super console: Organizations, Approvals, Billing, Audit, Services, Settings tabs — src/app/super/page.tsx (requireSuperAdmin else /login).",
    ),
    moduleSource: "custom",
    customModules: [
      { key: "orgs", label: t("المؤسسات (super_navOrganizations)", "Organizations (super_navOrganizations)") },
      { key: "approvals", label: t("الموافقات (super_navApprovals)", "Approvals (super_navApprovals)") },
      { key: "billing", label: t("الخطط والفوترة (super_navBilling)", "Plans & billing (super_navBilling)") },
      { key: "audit", label: t("تدقيق المنصة (super_navAudit)", "Platform audit (super_navAudit)") },
      { key: "services", label: t("الخدمات المعلقة (super_navServices)", "Pending services (super_navServices)") },
      { key: "settings", label: t("إعدادات المنصة (super_navSettings)", "Platform settings (super_navSettings)") },
      { key: "plans", label: t("كتالوج الخطط (/super/plans)", "Plans catalog (/super/plans)") },
    ],
    tasks: [
      {
        id: "super-org-status",
        icon: "Building2",
        title: t("إدارة العيادات وتغيير حالتها", "Manage clinics and change status"),
        where: t("صفحة /super — تبويب المؤسسات وأكشن الحالة عبر act()", "Page /super — Organizations tab and status action via act()"),
        steps: [
          t("يفتح /super فتُحمّل GET /api/super/orgs (تستبعد platform-admin).", "Opens /super; GET /api/super/orgs loads (excludes platform-admin)."),
          t("يغيّر الحالة (pending/active/suspended) فينفذ POST /api/super/orgs/[orgId]/status بالـ {status}.", "Changes status (pending/active/suspended), firing POST /api/super/orgs/[orgId]/status with {status}."),
        ],
        backend: t("فحص requireSuperAdmin المزدوج (دور + user.role=superAdmin)، رفض slug المنصة، وتدقيق UPDATE platform_organization_status.", "Double requireSuperAdmin check (role + user.role=superAdmin), platform-slug rejection, audit UPDATE platform_organization_status."),
        result: t("صف العيادة يتحدث بعد load().", "Org row refreshes after load()."),
      },
      {
        id: "super-plan-upgrade",
        icon: "CreditCard",
        title: t("تغيير خطة عيادة واعتماد الترقيات وتجاوزات الاستحقاق", "Change clinic plan, approve upgrades, manage overrides"),
        where: t("درج تفاصيل العيادة super-clinic-detail + تبويب الموافقات", "Org detail drawer super-clinic-detail + Approvals tab"),
        steps: [
          t("لتغيير الخطة: POST /api/super/orgs/[orgId]/plan بالـ {plan} (لازم يطابق prisma.plan.code) فيحدّث الخطة ويمسح الطلب وينشئ اشتراك 30 يومًا.", "To set plan: POST /api/super/orgs/[orgId]/plan with {plan} (must match prisma.plan.code); updates plan, clears request, upserts 30-day subscription."),
          t("لاعتماد ترقية: POST …/upgrade بالـ {approve} (يرفض إن لم يوجد طلب معلق).", "To approve upgrade: POST …/upgrade with {approve} (400 if none pending)."),
          t("للتجاوز: GET/POST …/override بالـ {moduleKey?, featureKey?, kind, valueJson?, reason, expiresAt?} وحذفه DELETE …/override/[overrideId].", "For overrides: GET/POST …/override with {moduleKey?, featureKey?, kind, valueJson?, reason, expiresAt?}; delete via DELETE …/override/[overrideId]."),
        ],
        backend: t("كلها requireSuperAdmin مع تدقيق platform_organization_plan[_declined] وplatform_entitlement_override.", "All requireSuperAdmin with platform_organization_plan[_declined] and platform_entitlement_override audits."),
        result: t("تفاصيل العيادة وطابور الموافقات يتحدثان.", "Org detail and approvals queue refresh."),
      },
      {
        id: "super-plans-catalog",
        icon: "ClipboardList",
        title: t("كتالوج الخطط (إنشاء/تعديل/نسخ)", "Plans catalog (create/edit/duplicate)"),
        where: t("صفحة /super/plans — PlansManager وزرار plans_newPlan", "Page /super/plans — PlansManager with plans_newPlan button"),
        steps: [
          t("ينشئ خطة عبر POST /api/super/plans بالحقول (code, nameEn/Ar, price, billingCycle, status, trialDays, modulesJson, featuresJson, ...).", "Creates a plan via POST /api/super/plans with (code, nameEn/Ar, price, billingCycle, status, trialDays, modulesJson, featuresJson, ...)."),
          t("يعدّل عبر PATCH /api/super/plans/[id] (يرفض استهداف الترقية لنفسه).", "Edits via PATCH /api/super/plans/[id] (rejects self upgrade-target)."),
          t("ينسخ عبر POST …/[id]/duplicate (code جديد + archived).", "Duplicates via POST …/[id]/duplicate (new code + archived)."),
        ],
        backend: t("كلها requireSuperAdmin، و409 عند تكرار الـ code.", "All requireSuperAdmin; 409 on duplicate code."),
        result: t("قائمة الخطط تتحدث وتظهر في /plan للعيادات.", "Plans list refreshes and appears in clinics' /plan."),
      },
      {
        id: "super-readonly",
        icon: "Eye",
        title: t("الموافقات والتدقيق والإعدادات والخدمات (قراءة وتنفيذ محدود)", "Approvals, audit, settings, services (read + limited writes)"),
        where: t("تبويبات /super: approvals وaudit وsettings وservices", "/super tabs: approvals, audit, settings, services"),
        steps: [
          t("الموافقات: GET /api/super/approvals يعرض التسجيلات المعلقة وطلبات الترقية (التنفيذ عبر أكشنات S1/S2).", "Approvals: GET /api/super/approvals lists pending signups and upgrade requests (acted via S1/S2 actions)."),
          t("التدقيق: GET /api/super/audit قراءة فقط (platform_* فقط، حد 100).", "Audit: GET /api/super/audit is read-only (platform_* only, limit 100)."),
          t("الإعدادات: GET/PUT /api/super/settings بالحقول (maintenanceMode, allowClinicSignups, defaultPlan, supportEmail, announcement).", "Settings: GET/PUT /api/super/settings with (maintenanceMode, allowClinicSignups, defaultPlan, supportEmail, announcement)."),
          t("الخدمات: بطاقات Pending Services قراءة فقط من GET /api/config/status — بلا أي زرار تنفيذ.", "Services: Pending Services cards are read-only from GET /api/config/status — no action buttons."),
        ],
        backend: t("كلها requireSuperAdmin، وتدقيق UPDATE platform_settings عند الحفظ.", "All requireSuperAdmin; audit UPDATE platform_settings on save."),
        result: t("نفس التبويبات تتحدث.", "Same tabs refresh."),
      },
    ],
    boundaries: [
      t("لا يرى أي صفحة عيادة (/dashboard وغيرها تُحوّل لـ /super عبر proxy).", "Sees no clinic page (/dashboard etc. redirect to /super via proxy)."),
      t("لا يكتب في بيانات عيادة عبر clinic APIs — الجلسة مقيدة بمنظمة platform-admin.", "Cannot write clinic data via clinic APIs — session scoped to platform-admin org."),
    ],
  },
  {
    id: "doctor",
    icon: "Stethoscope",
    name: t("الدكتور (Doctor)", "Doctor"),
    profile: t(
      "الطبيب المعالج: يشخّص، يوثّق الزيارات (SOAP)، يطلب التحاليل، يكتب الروشتات وخطط العلاج. يرى لوحة DoctorBoard ويملك أوسع موديولز سريرية.",
      "Treating physician: diagnoses, documents visits (SOAP), orders labs, writes prescriptions and treatment plans. Sees DoctorBoard and holds the widest clinical modules.",
    ),
    landing: t(
      "لوحة DoctorBoard في /dashboard: مواعيد اليوم الخاصة به، مرضاه، روشتاته، والقادم — src/components/dashboard/doctor-board.tsx.",
      "DoctorBoard in /dashboard: own today's appointments, own patients and prescriptions, upcoming — src/components/dashboard/doctor-board.tsx.",
    ),
    moduleSource: "rbac",
    roleKey: "Doctor",
    tasks: [
      {
        id: "doctor-encounter",
        icon: "Plus",
        title: t("بدء زيارة وإغلاقها", "Start and complete an encounter"),
        where: t("صفحة /encounters — بطاقة البدء (enc_start + قائمة المرضى) وزرار enc_complete", "Page /encounters — start card (enc_start + patient select) and enc_complete button"),
        steps: [
          t("يختار المريض ويدوس enc_start فينفذ POST /api/encounters بالـ {patientId, encounterType}.", "Selects patient, clicks enc_start, firing POST /api/encounters with {patientId, encounterType}."),
          t("للإغلاق: enc_complete فينفذ PATCH /api/encounters/[id] بالـ {status:completed} (إعادة فتح المغلق 409).", "To close: enc_complete fires PATCH /api/encounters/[id] with {status:completed} (reopening closed → 409)."),
        ],
        backend: t("الحماية: موديول encounters + encounters:write. الإنشاء يضبط in_progress وstartTime، والإغلاق endTime، مع تدقيق CREATE/UPDATE Encounter.", "Guard: encounters module + encounters:write. Create sets in_progress + startTime; close sets endTime; audit CREATE/UPDATE Encounter."),
        result: t("قائمة enc_recent تتحدث.", "enc_recent list refreshes."),
      },
      {
        id: "doctor-soap",
        icon: "FileText",
        title: t("ملاحظة SOAP والقوالب السريرية", "SOAP notes and clinical templates"),
        where: t("مساحة /encounters — حقول enc_soapSubjective/Objective/Assessment/Plan وزرار enc_addNote + مدير القوالب", "Workspace /encounters — enc_soap* fields, enc_addNote button, template manager"),
        steps: [
          t("يختار قالبًا (enc_tplSelect) فيُملأ الفراغ فقط، أو يكتب الحقول الأربعة (حتى 5000 حرف).", "Picks a template (enc_tplSelect, fills empties only) or types the 4 fields (max 5000 chars)."),
          t("يدوس enc_addNote فينفذ POST /api/encounters/[id]/notes بالـ {noteType:soap, subjective, objective, assessment, plan}.", "Clicks enc_addNote, firing POST /api/encounters/[id]/notes with {noteType:soap, subjective, objective, assessment, plan}."),
          t("لحفظ قالب: الاسم والتخصص + SOAP ثم enc_tplSave فينفذ POST /api/clinical-templates.", "To save a template: name + specialty + SOAP, then enc_tplSave fires POST /api/clinical-templates."),
        ],
        backend: t("الحماية encounters:write. إنشاء EncounterNote بالمؤلف + تدقيق، وإنشاء ClinicalTemplate + تدقيق.", "encounters:write guard. EncounterNote create with author + audit; ClinicalTemplate create + audit."),
        result: t("الملاحظات تظهر تحت الزيارة، والقوالب في القائمة.", "Notes render under the encounter; templates in the list."),
      },
      {
        id: "doctor-vitals",
        icon: "Activity",
        title: t("تسجيل العلامات الحيوية ورؤية المنحنى", "Record vitals and view trend"),
        where: t("صفحة المريض — بطاقة VitalsTrendCard (مؤشر + رسم SVG + إحصاءات)", "Patient page — VitalsTrendCard (metric select + SVG sparkline + stats)"),
        steps: [
          t("يُدخل القراءة عبر POST /api/vitals بالحقول (weightKg, heightCm, bloodPressureSystolic/Diastolic, heartRate, spO2, temperature).", "Enters reading via POST /api/vitals with (weightKg, heightCm, bloodPressureSystolic/Diastolic, heartRate, spO2, temperature)."),
          t("يفتح بطاقة المنحنى فيختار المؤشر (GET /api/vitals/trend?patientId=&metric=&days=).", "Opens the trend card, picks a metric (GET /api/vitals/trend?patientId=&metric=&days=)."),
        ],
        backend: t("الحماية encounters:write/patients:write للإدخال. حساب BMI تلقائيًا، وتدقيق CREATE Vital.", "encounters:write/patients:write guard for entry. Auto-BMI; audit CREATE Vital."),
        result: t("القائمة والرسم والإحصاءات (آخر/متوسط/مدى/تغير) تتحدث.", "List, sparkline and stats (last/avg/range/change) refresh."),
      },
      {
        id: "doctor-prescription",
        icon: "Pill",
        title: t("روشتة كاملة: إنشاء وإغلاق وإلغاء وحذف وطباعة", "Full prescription: create, complete, cancel, delete, print"),
        where: t("صفحة /prescriptions — NewPrescriptionDialog وأزرار rx_complete وrx_cancel وcommon_delete وrx_print", "Page /prescriptions — NewPrescriptionDialog plus rx_complete, rx_cancel, common_delete, rx_print buttons"),
        steps: [
          t("يدوس New فيفتح الديالوج: المريض + سطور الأدوية (medicationName, dosage, frequency, duration, instructions).", "Clicks New to open the dialog: patient + medication lines (medicationName, dosage, frequency, duration, instructions)."),
          t("يدوس Save فينفذ POST /api/prescriptions بالـ {patientId, encounterId, items} مع تحذيرات حساسية استشارية.", "Clicks Save, firing POST /api/prescriptions with {patientId, encounterId, items} plus advisory allergy warnings."),
          t("للإغلاق/الإلغاء: rx_complete/rx_cancel فينفذان PATCH بالـ {status} (+ sentToPharmacy).", "To complete/cancel: rx_complete/rx_cancel fire PATCH with {status} (+ sentToPharmacy)."),
          t("للحذف: common_delete للملغاة فقط (وإلا 409) فينفذ DELETE. للطباعة: rx_print يفتح /print/prescription/[id].", "To delete: common_delete for cancelled only (else 409) fires DELETE. To print: rx_print opens /print/prescription/[id]."),
        ],
        backend: t("الحماية: موديول labs + encounters:write/patients:write. منع تكرار idempotency، إنشاء العناصر والمفضلة في معاملة، وتدقيق CREATE/UPDATE/DELETE.", "Guard: labs module + encounters:write/patients:write. Idempotency dedupe, items+favorites in transaction, audit CREATE/UPDATE/DELETE."),
        result: t("الجدول يتحدث مع شارات الحالة.", "Table refreshes with status chips."),
      },
      {
        id: "doctor-rx-tools",
        icon: "Send",
        title: t("إرسال الروشتة والتكرار والنسخ والمفضلة والقوالب", "Send, repeat, clone, favorites, templates"),
        where: t("صفحة /prescriptions والديالوج: SendRxButton وrepeat-last-rx-button وclone-rx-button وقوائم المفضلة والقوالب", "Page /prescriptions and dialog: SendRxButton, repeat/clone buttons, favorites and template pickers"),
        steps: [
          t("للإرسال: SendRxButton فينفذ POST /api/prescriptions/[id]/send بالـ {channel: sms|whatsapp}.", "To send: SendRxButton fires POST /api/prescriptions/[id]/send with {channel: sms|whatsapp}."),
          t("للتكرار/النسخ: الزرار يفتح الديالوج مملوءًا من روشتة سابقة (إنشاء جديد دائمًا، لا تعديل الأصل).", "To repeat/clone: button opens the dialog prefilled from a prior Rx (always creates new, never mutates)."),
          t("المفضلة: إكمال تلقائي من GET /api/prescriptions/favorites?q= (لكل مستخدم).", "Favorites: autocomplete from GET /api/prescriptions/favorites?q= (per user)."),
          t("القوالب: اختيار/حفظ عبر /api/prescription-templates (مشتركة أو خاصة).", "Templates: pick/save via /api/prescription-templates (shared or private)."),
        ],
        backend: t("الإرسال يبني رسالة ويبعث SMS/WhatsApp ويسجل Communication + تدقيق (400 بلا هاتف).", "Send builds the message, delivers SMS/WhatsApp, records Communication + audit (400 without phone)."),
        result: t("{ok,status,communicationId} + toast، والقوائم تتحدث.", "{ok,status,communicationId} + toast; pickers refresh."),
      },
      {
        id: "doctor-labs",
        icon: "FlaskConical",
        title: t("طلبات التحاليل: إنشاء وإرسال واستلام ومراجعة", "Lab orders: create, transmit, ingest, review"),
        where: t("صفحة /labs — AddLabOrderDialog وAddLabResultDialog وLabOrdersSection", "Page /labs — AddLabOrderDialog, AddLabResultDialog, LabOrdersSection"),
        steps: [
          t("ينشئ طلبًا عبر POST /api/lab-orders بالـ {patientId, orderType: lab|imaging, testName, priority, indication}.", "Creates an order via POST /api/lab-orders with {patientId, orderType: lab|imaging, testName, priority, indication}."),
          t("يرسله عبر POST …/[id]/transmit فيُختم externalRef مع حمولة FHIR.", "Transmits via POST …/[id]/transmit, stamping externalRef with FHIR payload."),
          t("يستلم النتيجة عبر POST …/[id]/ingest بالـ {testName, resultValue, unit, referenceRange, status}.", "Ingests the result via POST …/[id]/ingest with {testName, resultValue, unit, referenceRange, status}."),
          t("يراجع عبر PATCH …/[id] بالـ {status: reviewed|abnormal, reviewNote?}.", "Reviews via PATCH …/[id] with {status: reviewed|abnormal, reviewNote?}."),
        ],
        backend: t("الحماية labs + encounters:write/patients:write. الاستلام يقلب الطلب resulted، والمراجعة تضبط reviewedBy/At، مع تدقيق.", "labs + encounters:write/patients:write guard. Ingest flips order to resulted; review stamps reviewedBy/At; audited."),
        result: t("بطاقات النتائج والطلبات تتحدث مع تمييز abnormal.", "Result/order cards refresh with abnormal highlight."),
      },
      {
        id: "doctor-diagnosis",
        icon: "ClipboardList",
        title: t("التشخيصات والمتابعات", "Diagnoses and follow-ups"),
        where: t("صفحة المريض — عبر POST /api/clinical-orders بالـ {kind: diagnosis|followUp}", "Patient page — via POST /api/clinical-orders with {kind: diagnosis|followUp}"),
        steps: [
          t("للتشخيص: {patientId, system, code, name, notes?} فيُنشأ Diagnosis نشطًا.", "For diagnosis: {patientId, system, code, name, notes?} creates an active Diagnosis."),
          t("للمتابعة: {patientId, dueDate, reason, instructions?} فيُنشأ FollowUp.", "For follow-up: {patientId, dueDate, reason, instructions?} creates a FollowUp."),
        ],
        backend: t("الحماية encounters + encounters:write/patients:write مع فحص ملكية المريض والزيارة، وتدقيق CREATE.", "encounters + encounters:write/patients:write guard with patient/encounter ownership checks, audit CREATE."),
        result: t("تظهر في GET /api/clinical-orders?patientId= وفي التايم لاين.", "Appear in GET /api/clinical-orders?patientId= and the timeline."),
      },
      {
        id: "doctor-treatment",
        icon: "HeartPulse",
        title: t("خطط العلاج وطباعتها", "Treatment plans and printing"),
        where: t("صفحة المريض — TreatmentPlansSection (إنشاء بالعنوان + خطوات)", "Patient page — TreatmentPlansSection (create by title + steps)"),
        steps: [
          t("ينشئ خطة عبر POST /api/treatment-plans بالـ {patientId, title} (تبدأ draft).", "Creates a plan via POST /api/treatment-plans with {patientId, title} (starts draft)."),
          t("يضيف خطوات عبر POST …/[id]/steps بالـ {kind, title} (diagnosis/prescription/procedure/followup/note).", "Adds steps via POST …/[id]/steps with {kind, title}."),
          t("ينهي الخطوات (pending→done) ثم يكمل الخطة PATCH {status:completed} (ممنوع مع خطوات معلقة).", "Finishes steps (pending→done), then completes the plan via PATCH {status:completed} (blocked with pending steps)."),
          t("للطباعة: POST /api/documents/generate بقالب treatment_plan.", "To print: POST /api/documents/generate with treatment_plan template."),
        ],
        backend: t("الحماية encounters:write حصرًا (patients:write لا تكفي هنا). انتقالات محكومة + تدقيق.", "encounters:write guard exclusively (patients:write insufficient here). Guarded transitions + audit."),
        result: t("GET /api/treatment-plans?patientId= يعرض الخطط بخطواتها.", "GET /api/treatment-plans?patientId= shows plans with steps."),
      },
      {
        id: "doctor-procedures",
        icon: "Activity",
        title: t("الأوامر الإجرائية", "Procedure orders"),
        where: t("صفحة المريض — عبر POST /api/procedure-orders", "Patient page — via POST /api/procedure-orders"),
        steps: [
          t("ينشئ أمرًا بالـ {patientId, procedureName, serviceCatalogId?, scheduledAt?, notes?}.", "Creates an order with {patientId, procedureName, serviceCatalogId?, scheduledAt?, notes?}."),
          t("يحدّث الحالة PATCH بالـ {status: ordered|in_progress|completed|cancelled} (المكتمل/الملغي نهائي).", "Updates status via PATCH {status} (completed/cancelled are terminal)."),
        ],
        backend: t("الحماية encounters + encounters:write/patients:write، مع فحص الكتالوج النشط، وتدقيق.", "encounters + encounters:write/patients:write guard, active-catalog check, audit."),
        result: t("GET /api/procedure-orders?patientId= يعرض الأوامر ومستنداتها.", "GET /api/procedure-orders?patientId= lists orders with documents."),
      },
      {
        id: "doctor-documents",
        icon: "FileText",
        title: t("مستندات المريض: رفع وتوليد وتحميل موقّع", "Patient documents: upload, generate, signed download"),
        where: t("صفحة /documents — UploadDocumentDialog وGenerateDocumentDialog وزرار common_view", "Page /documents — UploadDocumentDialog, GenerateDocumentDialog, common_view button"),
        steps: [
          t("للرفع: يرفع الملف عبر POST /api/uploads ثم POST /api/documents بالـ {patientId, type, name, storageKey, mimeType, publicId}.", "To upload: posts the file to POST /api/uploads, then POST /api/documents with {patientId, type, name, storageKey, mimeType, publicId}."),
          t("للتوليد: يختار قالبًا (referral/medical_report/...) عبر POST /api/documents/generate.", "To generate: picks a template (referral/medical_report/...) via POST /api/documents/generate."),
          t("للعرض: common_view يفتح downloadUrl الموقّع (HMAC منتهي).", "To view: common_view opens the signed downloadUrl (expiring HMAC)."),
        ],
        backend: t("الحماية documents + patients:write للكتابة. رفض روابط غير صادرة من السيرفر، وتدقيق CREATE/READ.", "documents + patients:write guard for writes. Non-server URLs rejected; audit CREATE/READ."),
        result: t("الجدول يعرض روابط تحميل موقّعة لكل صف.", "Table shows a signed download URL per row."),
      },
      {
        id: "doctor-availability",
        icon: "Clock",
        title: t("تعديل التوفر الشخصي", "Edit own availability"),
        where: t("صفحة /availability — فورم AvailabilityForm وزرار الحفظ", "Page /availability — AvailabilityForm with save button"),
        steps: [
          t("يعدل النوع والأيام والأوقات ثم يحفظ فينفذ PATCH /api/profile/availability.", "Edits type/days/times, saves, firing PATCH /api/profile/availability."),
        ],
        backend: t("بلا فحص granular — تحديث ذاتي + تدقيق UPDATE user_availability.", "No granular check — self update + audit UPDATE user_availability."),
        result: t("الفورم يعيد قراءة القيم + الحجز العام يستخدمها.", "Form reloads values; public booking honors them."),
      },
      {
        id: "doctor-consents",
        icon: "FileCheck2",
        title: t("الموافقات: عرض وتسجيل", "Consents: view and record"),
        where: t("صفحة /consents — AddConsentDialog (patientId, consentType, signedAt, documentUrl, isGranted)", "Page /consents — AddConsentDialog (patientId, consentType, signedAt, documentUrl, isGranted)"),
        steps: [
          t("يبحث برقم المريض (GET /api/consents?patientId=) ثم يسجل موافقة عبر POST /api/consents.", "Searches by patient (GET /api/consents?patientId=), then records via POST /api/consents."),
        ],
        backend: t("الحماية consents + patients:write للكتابة، وتدقيق CREATE Consent.", "consents + patients:write guard for writes, audit CREATE Consent."),
        result: t("قائمة الموافقات تتحدث.", "Consents list refreshes."),
      },
      {
        id: "doctor-analytics",
        icon: "Activity",
        title: t("المؤشرات والتقارير والتصدير", "Analytics, reports, export"),
        where: t("صفحتا /analytics و/reports — KPIs وأزرار الطباعة/CSV/XLSX", "Pages /analytics and /reports — KPIs plus print/CSV/XLSX buttons"),
        steps: [
          t("يرى KPIs من GET /api/analytics/dashboard (مرضى/مواعيد/إيراد/مستحق/تقييمات).", "Views KPIs from GET /api/analytics/dashboard (patients/visits/revenue/outstanding/ratings)."),
          t("يفتح التقرير الشهري GET /api/reports/monthly?month= ويصدّر CSV/XLSX من المتصفح.", "Opens monthly GET /api/reports/monthly?month= and exports CSV/XLSX client-side."),
          t("الجدولة البريدية للمالك فقط (POST Owner-only) — يراها ولا ينشئها.", "Mail scheduling is Owner-only (POST) — views but cannot create."),
        ],
        backend: t("الحماية analytics/billing:read وreports/billing:read. الجدولة requireOwner.", "analytics/billing:read and reports/billing:read guards. Scheduling requireOwner."),
        result: t("بطاقات وجداول التقرير.", "Report cards and tables."),
      },
      {
        id: "doctor-tasks-audit",
        icon: "ClipboardList",
        title: t("المهام وسجل التدقيق", "Tasks and audit trail"),
        where: t("صفحتا /tasks (CreateTaskDialog) و/audit (بحث وفلترة)", "Pages /tasks (CreateTaskDialog) and /audit (search + filters)"),
        steps: [
          t("ينشئ مهمة عبر POST /api/tasks بالـ {title, priority, dueDate?, patientId?} ويكملها PATCH {status:completed}.", "Creates a task via POST /api/tasks with {title, priority, dueDate?, patientId?}; completes via PATCH {status:completed}."),
          t("يراجع سجل التدقيق GET /api/audit?entityType=&limit= (حتى 100).", "Reviews audit via GET /api/audit?entityType=&limit= (max 100)."),
        ],
        backend: t("المهام tasks + patients/appointments write/read مع تدقيق. التدقيق يتطلب موديول audit (الدكتور يملكه).", "Tasks need tasks + patients/appointments write/read with audit. Audit needs audit module (Doctor holds it)."),
        result: t("قوائم المهام والسجل.", "Task and audit lists."),
      },
    ],
    boundaries: [
      t("لا يرى الفوترة والمدفوعات (/billing و/payments للدفع-Biller فقط + المالك).", "Sees no billing/payments (/billing, /payments are Biller-only + Owner)."),
      t("لا يدير المخزون والمعدات (موديول inventory للممرضة والصيدلي).", "No inventory/equipment (inventory module is Nurse/Pharmacist)."),
      t("لا يصل للإعدادات والخطط والطاقم والتكاملات (للمالك) ولا لمنصة السوبر.", "No settings/plans/staff/integrations (Owner) and no Super platform."),
      t("لا ينشئ جداول تقارير بريدية (POST للمالك فقط).", "Cannot create mail report schedules (Owner-only POST)."),
    ],
  },
  {
    id: "nurse",
    icon: "HeartPulse",
    name: t("الممرضة (Nurse)", "Nurse"),
    profile: t(
      "التمريض: يساعد في الزيارات والعلامات والتحاليل والروشتات، ويدير المخزون والمعدات. يرى لوحة care-board العامة ويملك موديولي inventory وqueue (لا audit).",
      "Nursing: assists in encounters, vitals, labs and prescriptions, and runs inventory and equipment. Sees the general care-board and holds the inventory and queue modules (no audit).",
    ),
    landing: t(
      "لوحة /dashboard العامة (care-board) — ليست DoctorBoard ولا ReceptionBoard (التفرع للدكتور وCare Coordinator فقط) — src/app/(dashboard)/dashboard/page.tsx:31-32.",
      "General /dashboard care-board — neither DoctorBoard nor ReceptionBoard (branch is Doctor and Care Coordinator only) — src/app/(dashboard)/dashboard/page.tsx:31-32.",
    ),
    moduleSource: "rbac",
    roleKey: "Nurse",
    tasks: [
      {
        id: "nurse-encounter",
        icon: "Plus",
        title: t("بدء زيارة وإغلاقها", "Start and complete an encounter"),
        where: t("صفحة /encounters — enc_start وenc_complete", "Page /encounters — enc_start and enc_complete"),
        steps: [
          t("يختار المريض ويدوس enc_start فينفذ POST /api/encounters بالـ {patientId, encounterType}.", "Selects patient, clicks enc_start, firing POST /api/encounters with {patientId, encounterType}."),
          t("للإغلاق: enc_complete فينفذ PATCH بالـ {status:completed}.", "To close: enc_complete fires PATCH with {status:completed}."),
        ],
        backend: t("نفس حماية الدكتور: موديول encounters + encounters:write، مع تدقيق.", "Same guard as Doctor: encounters module + encounters:write, audited."),
        result: t("قائمة enc_recent تتحدث.", "enc_recent list refreshes."),
      },
      {
        id: "nurse-soap",
        icon: "FileText",
        title: t("ملاحظات SOAP والقوالب", "SOAP notes and templates"),
        where: t("مساحة /encounters — الحقول الأربعة وزرار enc_addNote ومدير القوالب", "Workspace /encounters — four fields, enc_addNote button, template manager"),
        steps: [
          t("يطبق قالبًا أو يكتب SOAP ثم enc_addNote فينفذ POST /api/encounters/[id]/notes.", "Applies a template or types SOAP, then enc_addNote fires POST /api/encounters/[id]/notes."),
          t("يحفظ قوالب عبر enc_tplSave (POST /api/clinical-templates) ويحذفها common_delete.", "Saves templates via enc_tplSave (POST /api/clinical-templates); deletes via common_delete."),
        ],
        backend: t("encounters:write + تدقيق EncounterNote/ClinicalTemplate.", "encounters:write + EncounterNote/ClinicalTemplate audit."),
        result: t("الملاحظات والقوالب تتحدث.", "Notes and templates refresh."),
      },
      {
        id: "nurse-vitals",
        icon: "Activity",
        title: t("العلامات الحيوية والمنحنى", "Vitals and trend"),
        where: t("صفحة المريض — إدخال POST /api/vitals وبطاقة VitalsTrendCard", "Patient page — POST /api/vitals entry and VitalsTrendCard"),
        steps: [
          t("يُدخل (weightKg, heightCm, systolic/diastolic, heartRate, spO2, temperature).", "Enters (weightKg, heightCm, systolic/diastolic, heartRate, spO2, temperature)."),
          t("يراقب المنحنى عبر GET /api/vitals/trend?patientId=&metric=&days=.", "Monitors trend via GET /api/vitals/trend?patientId=&metric=&days=."),
        ],
        backend: t("BMI تلقائي + تدقيق CREATE Vital.", "Auto-BMI + CREATE Vital audit."),
        result: t("القائمة والرسم تتحدث.", "List and sparkline refresh."),
      },
      {
        id: "nurse-prescription",
        icon: "Pill",
        title: t("الروشتات: إنشاء ودورة حياة كاملة", "Prescriptions: create and full lifecycle"),
        where: t("صفحة /prescriptions — الديالوج والأزرار (نفس الدكتور تمامًا)", "Page /prescriptions — dialog and buttons (identical to Doctor)"),
        steps: [
          t("ينشئ عبر POST /api/prescriptions (نفس الحقول والتحذيرات الاستشارية).", "Creates via POST /api/prescriptions (same fields and advisory warnings)."),
          t("يكمل/يلغي عبر PATCH، ويحذف الملغاة فقط عبر DELETE، ويطبع عبر /print/prescription/[id].", "Completes/cancels via PATCH, deletes cancelled-only via DELETE, prints via /print/prescription/[id]."),
          t("يرسل ويدير المفضلة والقوالب (نفس أدوات الدكتور).", "Sends and manages favorites/templates (same Doctor tools)."),
        ],
        backend: t("الحماية labs + encounters:write/patients:write — لا فرع خاص بالدكتور في الكود.", "labs + encounters:write/patients:write guard — no Doctor-only branch in code."),
        result: t("الجدول يتحدث.", "Table refreshes."),
      },
      {
        id: "nurse-labs",
        icon: "FlaskConical",
        title: t("التحاليل: طلب وإرسال واستلام ومراجعة", "Labs: order, transmit, ingest, review"),
        where: t("صفحة /labs — نفس ديالوجات وأزرار الدكتور", "Page /labs — same dialogs and buttons as Doctor"),
        steps: [
          t("ينشئ POST /api/lab-orders، ويرسل transmit، ويستلم ingest، ويراجع PATCH.", "Creates POST /api/lab-orders, transmits, ingests, reviews via PATCH."),
        ],
        backend: t("نفس حماية labs + encounters:write/patients:write مع تدقيق.", "Same labs + encounters:write/patients:write guard, audited."),
        result: t("البطاقات تتحدث.", "Cards refresh."),
      },
      {
        id: "nurse-diagnosis",
        icon: "ClipboardList",
        title: t("التشخيصات والمتابعات وخطط العلاج والإجراءات", "Diagnoses, follow-ups, treatment plans, procedures"),
        where: t("صفحة المريض وTreatmentPlansSection — نفس الدكتور", "Patient page and TreatmentPlansSection — same as Doctor"),
        steps: [
          t("تشخيص/متابعة عبر POST /api/clinical-orders (نفس الحقول).", "Diagnosis/follow-up via POST /api/clinical-orders (same fields)."),
          t("خطط علاج: إنشاء وخطوات وإكمال وطباعة (ملاحظة: encounters:write إلزامي هنا).", "Treatment plans: create, steps, complete, print (note: encounters:write mandatory here)."),
          t("أوامر إجرائية عبر POST/PATCH /api/procedure-orders.", "Procedure orders via POST/PATCH /api/procedure-orders."),
        ],
        backend: t("نفس الحمايات والتدقيق كالدكتور.", "Same guards and audits as Doctor."),
        result: t("التايم لاين والقوائم تتحدث.", "Timeline and lists refresh."),
      },
      {
        id: "nurse-documents",
        icon: "FileText",
        title: t("المستندات والموافقات والمهام", "Documents, consents, tasks"),
        where: t("صفحات /documents و/consents و/tasks — نفس الدكتور", "Pages /documents, /consents, /tasks — same as Doctor"),
        steps: [
          t("رفع/توليد/عرض المستندات (documents + patients:write).", "Upload/generate/view documents (documents + patients:write)."),
          t("تسجيل الموافقات (consents + patients:write).", "Record consents (consents + patients:write)."),
          t("المهام: إنشاء وإكمال (tasks + patients/appointments write).", "Tasks: create and complete (tasks + patients/appointments write)."),
        ],
        backend: t("تدقيق لكل كتابة.", "Audit on every write."),
        result: t("القوائم تتحدث.", "Lists refresh."),
      },
      {
        id: "nurse-inventory",
        icon: "Package",
        title: t("المخزون: أصناف وحركات وتنبيهات (حصري للممرضة والصيدلي)", "Inventory: items, transactions, alerts (Nurse/Pharmacist only)"),
        where: t("صفحة /inventory — AddItemDialog وجدول الأصناف وبطاقات التنبيه", "Page /inventory — AddItemDialog, items table, alert cards"),
        steps: [
          t("يضيف صنفًا عبر POST /api/inventory بالـ {name, sku?, category?, quantity?, reorderLevel?, unit?, expiryDate?, batchNumber?}.", "Adds an item via POST /api/inventory with {name, sku?, category?, quantity?, reorderLevel?, unit?, expiryDate?, batchNumber?}."),
          t("يسجل حركة عبر POST /api/inventory/[id]/transaction بالـ {type: restock|usage|adjustment, quantity, reason?} (الكمية لا تسلب أبدًا).", "Posts a transaction via POST /api/inventory/[id]/transaction with {type, quantity, reason?} (quantity never negative)."),
          t("يراقب تنبيهات GET /api/inventory/alerts (منتهي/قريب/ناقص).", "Watches GET /api/inventory/alerts (expired/expiring/low)."),
        ],
        backend: t("الحماية inventory + inventory:write للكتابة، ومعاملة ذرية + تدقيق.", "inventory + inventory:write guard for writes, atomic transaction + audit."),
        result: t("الجدول والتنبيهات تتحدث. الدكتور محظور افتراضيًا (لا موديول inventory).", "Table and alerts refresh. Doctor blocked by default (no inventory module)."),
      },
      {
        id: "nurse-equipment",
        icon: "Wrench",
        title: t("المعدات وسجل الصيانة (حصري للممرضة والصيدلي)", "Equipment and maintenance log (Nurse/Pharmacist only)"),
        where: t("صفحة /equipment — السجل والبحث وشارات المعايرة وبطاقتا الإنشاء والصيانة", "Page /equipment — registry, search, calibration badges, create + maintenance cards"),
        steps: [
          t("يسجل معدة عبر POST /api/equipment بالـ {name, type, status, last/nextCalibrationAt}.", "Registers equipment via POST /api/equipment with {name, type, status, last/nextCalibrationAt}."),
          t("يسجل صيانة عبر POST /api/equipment/[id]/maintenance بالـ {type, status, technician?, dueAt?, notes?, cost?}.", "Logs maintenance via POST /api/equipment/[id]/maintenance with {type, status, technician?, dueAt?, notes?, cost?}."),
        ],
        backend: t("الحماية inventory:write. الصيانة تحدّث تواريخ المعايرة وتقلب الحالة maintenance_required عند الاستحقاق + تدقيق.", "inventory:write guard. Maintenance recomputes calibration dates, flips maintenance_required when due + audit."),
        result: t("السجل والشارات (CalOk/Warning/Overdue) تتحدث.", "Registry and badges (CalOk/Warning/Overdue) refresh."),
      },
      {
        id: "nurse-view",
        icon: "Eye",
        title: t("عرض: التوفر والتحليلات والكتالوجات", "View: availability, analytics, catalogs"),
        where: t("صفحات /availability و/analytics و/catalogs", "Pages /availability, /analytics, /catalogs"),
        steps: [
          t("يعدل توفره الشخصي PATCH /api/profile/availability (مثل الدكتور).", "Edits own availability via PATCH /api/profile/availability (like Doctor)."),
          t("يرى KPIs والتقارير والتصدير (الإنشاء البريدي للمالك فقط).", "Views KPIs, reports, export (mail scheduling Owner-only)."),
          t("يرى الكتالوجات فقط — الإنشاء requireOwner.", "Views catalogs only — creation is requireOwner."),
        ],
        backend: t("تحديث ذاتي + تدقيق التوفر.", "Self update + availability audit."),
        result: t("الصفحات تعرض البيانات.", "Pages render data."),
      },
    ],
    boundaries: [
      t("الطابور يعمل للممرضة (موديول queue + صفحة /queue + زر تسجيل الحيوية). لا ترى سجل التدقيق (موديول audit للدكتور والدفع-Biller فقط).", "Queue works for Nurse (queue module + /queue page + record-vitals button). No audit trail (audit module is Doctor/Biller only)."),
      t("لا يرى سجل التدقيق (موديول audit للدكتور والدفع-Biller فقط).", "No audit trail (audit module is Doctor/Biller only)."),
      t("لا يرى الفوترة والمدفوعات والتأمين (Biller + المالك).", "No billing/payments/insurance (Biller + Owner)."),
      t("لا يرى الاتصالات والحملات والانتظار والمواقع (الاستقبال) ولا الإعدادات (المالك).", "No communications/campaigns/waitlist/locations (Reception) and no settings (Owner)."),
    ],
  },
  {
    id: "receptionist",
    icon: "Bell",
    name: t("الاستقبال (Receptionist / Care Coordinator)", "Receptionist (Care Coordinator)"),
    profile: t(
      "واجهة العيادة: الحجوزات والطابور والحضور والانتظار والتواصل مع المرضى. الدور المحفوظ اسمه Care Coordinator ويُعرض كمستقبِل (role-labels + proxy). يرى لوحة ReceptionBoard.",
      "Clinic front desk: bookings, queue, attendance, waitlist, patient comms. Stored role is Care Coordinator, displayed as Receptionist (role-labels + proxy). Sees ReceptionBoard.",
    ),
    landing: t(
      "لوحة ReceptionBoard في /dashboard: أعداد الانتظار/الحاضرين/المكتمل/no-show وجدول طابور اليوم بأزرار check-in/out/no-show — src/components/dashboard/reception-board.tsx.",
      "ReceptionBoard in /dashboard: waiting/attended/completed/no-show counts plus today's queue table with check-in/out/no-show buttons — src/components/dashboard/reception-board.tsx.",
    ),
    moduleSource: "rbac",
    roleKey: "Care Coordinator",
    tasks: [
      {
        id: "recep-book",
        icon: "CalendarPlus",
        title: t("حجز موعد جديد", "Book a new appointment"),
        where: t("صفحة /appointments — زرار book_title وديالوج الحجز", "Page /appointments — book_title button and booking dialog"),
        steps: [
          t("يملأ: المريض (book_patient) والدكتور (appts_provider) والتاريخ والوقت والنوع ثم book_book.", "Fills patient (book_patient), provider, date, time, type, then book_book."),
          t("يُنفذ POST /api/appointments (يتطلب date+time أو startTime+endTime).", "Fires POST /api/appointments (needs date+time or startTime+endTime)."),
        ],
        backend: t("فحص appointments:write، منع idempotency المكرر، حد الخطة، توفر الدكتور، تعارض الحجز (409)، رقم walk-in، وتدقيق CREATE.", "appointments:write check, idempotency dedupe, plan limit, doctor availability, conflict check (409), walk-in token, CREATE audit."),
        result: t("الموعد يظهر في القائمة واليوم والتقويم.", "Appointment appears in list/day/calendar views."),
      },
      {
        id: "recep-edit-cancel",
        icon: "Pencil",
        title: t("تعديل/إلغاء موعد (مع عرض الانتظار تلقائيًا)", "Edit/cancel appointment (with waitlist auto-offer)"),
        where: t("صف /appointments — appts_edit (Pencil) وappts_cancel (Ban) بتأكيد", "Row in /appointments — appts_edit (Pencil) and appts_cancel (Ban) with confirm"),
        steps: [
          t("للتعديل: يغيّر الدكتور/التاريخ/الوقت/الحالة ثم appts_saveChanges فينفذ PATCH /api/appointments.", "To edit: changes provider/date/time/status, then appts_saveChanges fires PATCH /api/appointments."),
          t("للإلغاء: تأكيد common_confirmAction ثم updateAppointment بالـ Cancelled.", "To cancel: common_confirmAction confirm, then updateAppointment to Cancelled."),
        ],
        backend: t("فحص انتقالات الحالة (409 للمخالف)، تعارض إعادة الجدولة (409)، وعند الإلغاء/no-show لموعد مستقبلي: autoOfferFreedSlot يعرضه على الانتظار.", "Status-transition check (409), reschedule conflict (409); on cancel/no-show of future visit: autoOfferFreedSlot offers it to waitlist."),
        result: t("الصف يتحدث + حقل waitlistOffers في الرد.", "Row refreshes + waitlistOffers in response."),
      },
      {
        id: "recep-reception",
        icon: "Check",
        title: t("حضور/انصراف/no-show", "Check-in / check-out / no-show"),
        where: t("لوحة ReceptionBoard وصفحة /queue — أزرار reception_checkIn/checkOut/markNoShow", "ReceptionBoard and /queue page — reception_checkIn/checkOut/markNoShow buttons"),
        steps: [
          t("check-in للـ scheduled/confirmed فينفذ POST …/check-in (يصبح arrived + ختم).", "Check-in for scheduled/confirmed fires POST …/check-in (becomes arrived + stamp)."),
          t("check-out للـ in_progress فقط فينفذ POST …/check-out (يصبح completed).", "Check-out for in_progress only fires POST …/check-out (becomes completed)."),
          t("no-show للـ scheduled/confirmed/arrived فينفذ POST …/no-show.", "No-show for scheduled/confirmed/arrived fires POST …/no-show."),
        ],
        backend: t("الحماية appointments + appointments:write (src/lib/reception.ts). المصدر الخاطئ 409، مع تدقيق UPDATE.", "appointments + appointments:write guard (src/lib/reception.ts). Wrong source → 409, audited UPDATE."),
        result: t("الجدول يتحدث. ملاحظة: لا إتمام مباشر من scheduled — لازم call-next أولًا.", "Table refreshes. Note: no direct completion from scheduled — call-next first."),
      },
      {
        id: "recep-queue",
        icon: "Phone",
        title: t("إدارة الطابور المباشر", "Run the live queue"),
        where: t("صفحة /queue — زرار queue_callNext العام وأزرار الصفوف", "Page /queue — header queue_callNext button and row buttons"),
        steps: [
          t("call-next ينقل أقدم arrived إلى in_progress (أو يختار موعدًا محددًا).", "Call-next moves oldest arrived to in_progress (or a chosen visit)."),
          t("complete ينهي in_progress، وno-show يسجل الغياب.", "Complete finishes in_progress; no-show records absence."),
          t("الكل عبر POST /api/queue/actions بالـ {action, appointmentId?}.", "All via POST /api/queue/actions with {action, appointmentId?}."),
        ],
        backend: t("الحماية queue + appointments:write. اختيار تلقائي للأقدم، وتحديث ذري CAS (409 عند السباق)، مع تدقيق.", "queue + appointments:write guard. Auto-picks oldest, atomic CAS update (409 on race), audited."),
        result: t("القائمة تُعاد تحميلها.", "List reloads."),
      },
      {
        id: "recep-waitlist",
        icon: "Clock",
        title: t("قائمة الانتظار والحجز منها", "Waitlist and booking from it"),
        where: t("صفحة /waitlist — wl_addTrigger وديالوج الحجز wl_book", "Page /waitlist — wl_addTrigger and wl_book booking dialog"),
        steps: [
          t("يضيف عبر POST /api/waitlist بالـ {patientId, preferredDate?, notes?} (يبدأ waiting).", "Adds via POST /api/waitlist with {patientId, preferredDate?, notes?} (starts waiting)."),
          t("يحجز عبر POST /api/waitlist/[id]/book بالـ {providerId, startTime} (لـ waiting/offered فقط).", "Books via POST /api/waitlist/[id]/book with {providerId, startTime} (waiting/offered only)."),
        ],
        backend: t("الحماية waitlist + patients/appointments write. رفض الماضي (400) والتعارض (409)، وقلب المدخل booked + تدقيق.", "waitlist + patients/appointments write guard. Past rejection (400), conflict (409), flips entry booked + audit."),
        result: t("الحالات (waiting/contacted/scheduled/booked) والتصدير CSV.", "Statuses (waiting/contacted/scheduled/booked) plus CSV export."),
      },
      {
        id: "recep-add-patient",
        icon: "UserPlus",
        title: t("إضافة مريض والبحث والأرشفة والدمج", "Add, search, archive, merge patients"),
        where: t("صفحة /patients — addPatient_trigger والبحث وpatients_manage وpatients_merge", "Page /patients — addPatient_trigger, search, patients_manage, patients_merge"),
        steps: [
          t("يضيف عبر AddPatientDialog (الإلزامي: firstName وlastName فقط) فينفذ POST /api/patients (MRN تلقائي).", "Adds via AddPatientDialog (required: firstName + lastName only), firing POST /api/patients (auto MRN)."),
          t("يبحث نصًا (اسم/MRN/هاتف) ويفلتر بالحالة.", "Searches text (name/MRN/phone) and filters by status."),
          t("يؤرشف/يستعيد عبر POST …/[id]/archive، ويدمج عبر POST …/[id]/merge بالـ {survivorId} — مسموح (patients:write).", "Archives/restores via POST …/[id]/archive; merges via POST …/[id]/merge with {survivorId} — allowed (patients:write)."),
        ],
        backend: t("الحماية patients:read/write، حد الخطة، تشفير الحساس، MRN فريد لكل مؤسسة، وتدقيق (منها PatientMerge).", "patients:read/write guard, plan limit, sensitive encryption, per-org unique MRN, audits (incl. PatientMerge)."),
        result: t("القوائم تتحدث عبر refetchPatients.", "Lists refresh via refetchPatients."),
      },
      {
        id: "recep-comms",
        icon: "Send",
        title: t("إرسال SMS/واتساب/بريد وعرض المجدول", "Send SMS/WhatsApp/email and view scheduled"),
        where: t("صفحة /communications — comm_sendMessage وديالوج الإرسال", "Page /communications — comm_sendMessage button and send dialog"),
        steps: [
          t("يملأ: المريض والقناة (sms/email/whatsapp) والنوع والمحتوى والتاريخ الاختياري ثم comm_send.", "Fills patient, channel (sms/email/whatsapp), type, content, optional date, then comm_send."),
          t("الفوري يُرسل عبر POST /api/communications، والمؤجل يُرسل عبر cron فقط.", "Immediate sends via POST /api/communications; scheduled dispatches via cron only."),
        ],
        backend: t("الحماية communications + patients/appointments write (+ استحقاق الخطة). الفشل يُسجل failed، والتدقيق best-effort.", "communications + patients/appointments write guard (+ plan entitlement). Failures logged failed; best-effort audit."),
        result: t("الجدول يعرض الحالات (pending/sent/delivered/failed/scheduled).", "Table shows statuses (pending/sent/delivered/failed/scheduled)."),
      },
      {
        id: "recep-campaigns-blocked",
        icon: "Megaphone",
        title: t("الحملات: متاحة للاستقبال (أُصلحت في G13)", "Campaigns: available to Reception (fixed in G13)"),
        where: t("صفحة /campaigns — السايدبار والـ proxy والـ API كلها تسمح للاستقبال الآن", "Page /campaigns — sidebar, proxy, and API all allow Reception now"),
        steps: [
          t("ينشئ حملة عبر POST /api/communications/campaigns (مسودة draft).", "Creates a campaign via POST /api/communications/campaigns (draft)."),
          t("يطلقها عبر POST …/[id]/launch (تصبح active).", "Launches it via POST …/[id]/launch (becomes active)."),
        ],
        backend: t("الحماية campaigns + موديول campaigns (أُضيف للاستقبال في G13) مع حد الخطة.", "campaigns guard + campaigns module (granted to Reception in G13) with plan limit."),
        result: t("القائمة تتحدث والحملة تُرسل.", "List refreshes and the campaign sends."),
      },
      {
        id: "recep-consents",
        icon: "FileCheck2",
        title: t("الموافقات: عرض وتسجيل", "Consents: view and record"),
        where: t("صفحة /consents — AddConsentDialog", "Page /consents — AddConsentDialog"),
        steps: [
          t("يسجل عبر POST /api/consents بالـ {patientId, consentType, isGranted?, signedAt?, documentUrl?}.", "Records via POST /api/consents with {patientId, consentType, isGranted?, signedAt?, documentUrl?}."),
        ],
        backend: t("الحماية consents + patients:write، مع تدقيق CREATE Consent.", "consents + patients:write guard, audit CREATE Consent."),
        result: t("القائمة تتحدث.", "List refreshes."),
      },
      {
        id: "recep-documents",
        icon: "FileText",
        title: t("مستندات المرضى: عرض ورفع", "Patient documents: view and upload"),
        where: t("صفحة /documents — الجدول وUploadDocumentDialog", "Page /documents — table and UploadDocumentDialog"),
        steps: [
          t("يرفع عبر POST /api/uploads ثم POST /api/documents (مسموح: patients:write).", "Uploads via POST /api/uploads then POST /api/documents (allowed: patients:write)."),
          t("يعرض عبر روابط downloadUrl الموقّعة (common_view).", "Views via signed downloadUrl links (common_view)."),
        ],
        backend: t("الحماية documents + patients:read/write، رفض الروابط الخارجية، وتدقيق.", "documents + patients:read/write guard, external URLs rejected, audit."),
        result: t("الجدول يتحدث.", "Table refreshes."),
      },
      {
        id: "recep-locations-view",
        icon: "Eye",
        title: t("الفروع والغرف: عرض فقط", "Branches and rooms: view only"),
        where: t("صفحة /locations — القوائم ظاهرة ونماذج الإضافة تفشل", "Page /locations — lists visible, add forms fail"),
        steps: [
          t("يرى الفروع والغرف عبر GET (مسموح: locations + appointments:write).", "Views branches/rooms via GET (allowed: locations + appointments:write)."),
          t("الإضافة POST تتطلب requireOwner فترد 403 وtoast locations_saveError.", "Adds need requireOwner → 403 + locations_saveError toast."),
        ],
        backend: t("القراءة بموديول، الكتابة للمالك فقط.", "Reads by module, writes Owner-only."),
        result: t("لا تغيير — الإنشاء للمالك.", "No change — creation is Owner's."),
      },
      {
        id: "recep-tasks-day",
        icon: "ClipboardList",
        title: t("المهام وأجندة اليوم", "Tasks and day agenda"),
        where: t("صفحة /tasks (CreateTaskDialog) وتبويب day في /appointments", "Page /tasks (CreateTaskDialog) and day tab in /appointments"),
        steps: [
          t("ينشئ مهمة عبر POST /api/tasks بالـ {title, priority?, dueDate?, patientId?}.", "Creates a task via POST /api/tasks with {title, priority?, dueDate?, patientId?}."),
          t("يتابع أجندة اليوم (نفس GET /api/appointments) مع تعديل/إلغاء لكل صف.", "Follows the day agenda (same GET /api/appointments) with per-row edit/cancel."),
        ],
        backend: t("الحماية tasks + patients/appointments write/read مع تدقيق.", "tasks + patients/appointments write/read guard, audited."),
        result: t("القوائم تتحدث.", "Lists refresh."),
      },
    ],
    boundaries: [
      t("الحملات متاحة للاستقبال (إنشاء وإطلاق) منذ إصلاح G13.", "Campaigns are available to Reception (create and launch) since the G13 fix."),
      t("إنشاء الفروع/الغرف والكتالوجات للمالك فقط.", "Branch/room and catalog creation is Owner-only."),
      t("لا فوترة/مدفوعات/تأمين (Biller)، ولا روشتات/تحاليل/زيارات (الدكتور/الممرضة).", "No billing/payments/insurance (Biller), no encounters/labs/prescriptions (Doctor/Nurse)."),
      t("لا إعدادات/خطط/طاقم/تكاملات (المالك) ولا منصة السوبر.", "No settings/plans/staff/integrations (Owner) and no Super platform."),
      t("تشغيل cron التذكيرات تلقائي — لا زرار يدوي له.", "Reminder crons run automatically — no manual trigger button."),
    ],
  },
  {
    id: "biller",
    icon: "Wallet",
    name: t("المحاسب (Biller)", "Biller"),
    profile: t(
      "مسؤول الإيراد: الفواتير والمدفوعات والاسترداد والتقسيط والتأمين والمصروفات والتقارير المالية. يرى لوحة care-board العامة.",
      "Revenue owner: invoices, payments, refunds, installments, insurance, expenses, financial reports. Sees the general care-board.",
    ),
    landing: t(
      "لوحة /dashboard العامة (care-board) — لا فرع خاص بالمحاسب في الكود.",
      "General /dashboard care-board — no Biller branch in code.",
    ),
    moduleSource: "rbac",
    roleKey: "Biller",
    tasks: [
      {
        id: "biller-invoice",
        icon: "FileText",
        title: t("إنشاء فاتورة", "Create an invoice"),
        where: t("صفحة /billing — زرار New Invoice (Plus) وديالوج الإنشاء", "Page /billing — New Invoice button (Plus) and create dialog"),
        steps: [
          t("يملأ: المريض والوصف والكمية والسعر وتاريخ الاستحقاق وكود خصم اختياري.", "Fills patient, description, quantity, unit price, due date, optional coupon code."),
          t("يدوس Create فينفذ POST /api/billing/invoices بالـ {patientId, lineItems:[{description, quantity, unitPrice}], couponCode?, idempotencyKey}.", "Clicks Create, firing POST /api/billing/invoices with {patientId, lineItems, couponCode?, idempotencyKey}."),
        ],
        backend: t("الحماية billing. منع تكرار idempotency، فحص الكوبون وتطبيقه، إنشاء الفاتورة (draft) + البنود + تدقيق CREATE في معاملة.", "billing guard. Idempotency dedupe, coupon validate + apply, invoice (draft) + items + audit CREATE in transaction."),
        result: t("الجدول يتحدث (الرقم/المريض/الإجمالي/الحالة).", "Table refreshes (number/patient/total/status)."),
      },
      {
        id: "biller-payment",
        icon: "CreditCard",
        title: t("تسجيل مدفوعة (كاش/تحويل/بطاقة)", "Record a payment (cash/transfer/card)"),
        where: t("ديالوج PaymentDialog — زرار pay_processPayment (Plus)", "PaymentDialog — pay_processPayment button (Plus)"),
        steps: [
          t("يملأ: الفاتورة والمبلغ والعملة والطريقة (card/online/cash/transfer/check/insurance).", "Fills invoice, amount, currency, method (card/online/cash/transfer/check/insurance)."),
          t("يدوس Save فينفذ POST /api/payments بالـ {invoiceId, amount, currency, method}.", "Clicks Save, firing POST /api/payments with {invoiceId, amount, currency, method}."),
        ],
        backend: t("الحماية billing. رفض تجاوز المستحق (400). اليدوي (كاش/تحويل/...) يُسوّى فورًا completed، والبطاقة تنشئ Stripe PaymentIntent معلقًا + تدقيق.", "billing guard. Overpay rejected (400). Manual settles immediately to completed; card creates pending Stripe PaymentIntent + audit."),
        result: t("toast pay_recorded أو pay_intentCreated، وقائمة /payments تتحدث.", "pay_recorded or pay_intentCreated toast; /payments list refreshes."),
      },
      {
        id: "biller-refund",
        icon: "Undo2",
        title: t("استرداد مدفوعة (بخطوتين)", "Refund a payment (two-step)"),
        where: t("جدول /payments — pay_refund ثم pay_refundConfirm (Undo2)", "Table /payments — pay_refund then pay_refundConfirm (Undo2)"),
        steps: [
          t("يدوس pay_refund أول مرة للتسليح (ينفك بعد 5 ثوانٍ)، ثم pay_refundConfirm للتنفيذ.", "Clicks pay_refund once to arm (auto-disarms in 5s), then pay_refundConfirm to fire."),
          t("يُنفذ POST /api/payments/[id]/refund بلا body (استرداد كامل من الواجهة).", "Fires POST /api/payments/[id]/refund with empty body (full refund from UI)."),
        ],
        backend: t("تكرار نفس refundKey يُختصر، والمستردة تُختصر، وفقط completed يُسترد. قفل متفائل (409 عند السباق)، وStripe بمفتاح idempotency، مع تدقيق.", "Same-refundKey replay short-circuits; only completed refundable. Optimistic lock (409 on race); Stripe with idempotency key; audited."),
        result: t("toast pay_refundedSuccess والشعار يتحول refunded. (الجزئي والمفتاح: API فقط).", "pay_refundedSuccess toast; badge flips to refunded. (Partial + keys: API-only)."),
      },
      {
        id: "biller-receipt",
        icon: "Printer",
        title: t("طباعة إيصال", "Print a receipt"),
        where: t("رابط مباشر /print/receipt/[invoiceId] + زرار PrintButton", "Direct URL /print/receipt/[invoiceId] + PrintButton"),
        steps: [
          t("يفتح /print/receipt/[invoiceId] (لا زرار داخلي موثق — يُفتح مباشرة).", "Opens /print/receipt/[invoiceId] (no verified in-app button — open directly)."),
          t("يدوس Print للطباعة (ورقة A5: البنود والإجمالي والمدفوع والمتبقي والطريقة).", "Clicks Print (A5 sheet: lines, total, paid, balance, method)."),
        ],
        backend: t("قراءة مباشرة Prisma للفاتورة والمريض والمؤسسة (404 لغير المؤسسة).", "Direct Prisma read of invoice/patient/org (404 outside org)."),
        result: t("ورقة الطباعة.", "Printed sheet."),
      },
      {
        id: "biller-installments",
        icon: "CalendarDays",
        title: t("التقسيط: إنشاء ودفع", "Installments: create and pay"),
        where: t("جدول /billing — billing_installments (Wallet) وديالوج الأقساط", "Table /billing — billing_installments (Wallet) action and installments dialog"),
        steps: [
          t("ينشئ عبر POST /api/installment-plans بالـ {invoiceId, count 2-24, firstDueDate, frequency, downPayment}.", "Creates via POST /api/installment-plans with {invoiceId, count 2-24, firstDueDate, frequency, downPayment}."),
          t("يدفع قسطًا عبر POST …/[id]/pay بالـ {installmentId, method}.", "Pays a due via POST …/[id]/pay with {installmentId, method}."),
          t("الإلغاء API فقط: PATCH …/[id] بالـ {status:cancelled} (لا زرار).", "Cancel is API-only: PATCH …/[id] with {status:cancelled} (no button)."),
        ],
        backend: t("الحماية billing. خطة نشطة واحدة، الدفعة المقدمة تُسوّى فورًا، الدفع ذري compare-and-set (409 للتكرار)، وتدقيق.", "billing guard. One active plan; down-payment settles at once; atomic compare-and-set pay (409 on double-pay); audited."),
        result: t("قائمة الخطط والأقساط (pending/paid/overdue) تتحدث.", "Plans and dues list (pending/paid/overdue) refreshes."),
      },
      {
        id: "biller-insurance",
        icon: "ShieldCheck",
        title: t("التأمين: سياسات وأهلية ومطالبات", "Insurance: policies, eligibility, claims"),
        where: t("صفحة /insurance — تبويبا السياسات/المطالبات ونماذج الإنشاء", "Page /insurance — policies/claims tabs and inline create forms"),
        steps: [
          t("ينشئ سياسة عبر POST /api/insurance/policies بالـ {patientId, provider, policyNumber, groupNumber?, type}.", "Creates a policy via POST /api/insurance/policies with {patientId, provider, policyNumber, groupNumber?, type}."),
          t("يفحص الأهلية عبر GET …/policies/[id]/eligibility (نشاط المؤسسة + وجود سياسة + عدم أرشفة).", "Checks eligibility via GET …/policies/[id]/eligibility (org active + policy exists + not archived)."),
          t("يقدم مطالبة عبر POST /api/insurance/claims بالـ {patientId, invoiceId?, amountClaimed}.", "Files a claim via POST /api/insurance/claims with {patientId, invoiceId?, amountClaimed}."),
          t("يقدّم الحالة عبر PATCH …/claims/[id] (submitted→pending→paid/denied→appeal) — المخالف 409.", "Advances status via PATCH …/claims/[id] (submitted→pending→paid/denied→appeal) — illegal → 409."),
        ],
        backend: t("الحماية billing. الدفع paid يخصم من الفاتورة بحد المستحق + تدقيق.", "billing guard. paid status credits the invoice capped at outstanding + audit."),
        result: t("الجداول والشارات تتحدث.", "Tables and badges refresh."),
      },
      {
        id: "biller-expenses",
        icon: "Wallet",
        title: t("المصروفات: إضافة وحذف", "Expenses: add and delete"),
        where: t("بطاقة /billing السفلية — exp_add (Plus) وexp_delete (Trash2) بتأكيد", "Bottom card in /billing — exp_add (Plus) and exp_delete (Trash2) with confirm"),
        steps: [
          t("يضيف عبر POST /api/expenses بالـ {category, amount, spentAt?, branchId?, notes?}.", "Adds via POST /api/expenses with {category, amount, spentAt?, branchId?, notes?}."),
          t("يحذف عبر DELETE /api/expenses/[id] (التصحيح = حذف + إعادة).", "Deletes via DELETE /api/expenses/[id] (correction = delete + re-add)."),
        ],
        backend: t("الحماية billing. فحص الفرع، وتدقيق CREATE/DELETE.", "billing guard. Branch check; audit CREATE/DELETE."),
        result: t("القائمة والإجمالي وصافي الربح تتحدث.", "List, total and net profit refresh."),
      },
      {
        id: "biller-coupons",
        icon: "Copy",
        title: t("الكوبونات: استخدام (والإنشاء API فقط)", "Coupons: apply (creation is API-only)"),
        where: t("ديالوج الفاتورة — حقل Coupon code (لا نموذج إنشاء في الواجهة)", "Invoice dialog — Coupon code field (no create form in UI)"),
        steps: [
          t("يكتب الكود في الفاتورة فيُفحص (نشط وغير منتهٍ) ويُخصم عبر applyCouponDiscount.", "Types the code in the invoice; validated (active, unexpired) and discounted via applyCouponDiscount."),
          t("الإنشاء عبر POST /api/coupons بالـ {code, kind: percent|fixed, value, expiresAt?} (API فقط).", "Creation via POST /api/coupons with {code, kind, value, expiresAt?} (API-only)."),
        ],
        backend: t("الحماية billing. percent ≤100، وتكرار الكود 409، وتدقيق CREATE Coupon.", "billing guard. percent ≤100, duplicate code 409, audit CREATE Coupon."),
        result: t("الكود يُحفظ على الفاتورة (couponCode + orderDiscount).", "Code stored on invoice (couponCode + orderDiscount)."),
      },
      {
        id: "biller-reports",
        icon: "Activity",
        title: t("التقارير والتحليلات والتدقيق", "Reports, analytics, audit"),
        where: t("صفحات /reports و/analytics و/audit", "Pages /reports, /analytics, /audit"),
        steps: [
          t("يفتح التقرير الشهري GET /api/reports/monthly?month= ويصدّر CSV/XLSX ويطبع.", "Opens monthly GET /api/reports/monthly?month=; exports CSV/XLSX; prints."),
          t("يرى KPIs من GET /api/analytics/dashboard.", "Views KPIs from GET /api/analytics/dashboard."),
          t("يراجع التدقيق GET /api/audit (مسموح عبر billing:read).", "Reviews audit via GET /api/audit (allowed via billing:read)."),
          t("الجدولة البريدية للمالك فقط — عرض بلا إنشاء.", "Mail scheduling is Owner-only — view without create."),
        ],
        backend: t("الحماية billing:read للتقارير والتحليلات والتدقيق.", "billing:read guard for reports/analytics/audit."),
        result: t("البطاقات والجداول.", "Cards and tables."),
      },
      {
        id: "biller-invoices",
        icon: "Search",
        title: t("البحث في الفواتير والمهام", "Search invoices and tasks"),
        where: t("صفحة /billing — بحث billing_search وفلتر الحالة + صفحة /tasks", "Page /billing — billing_search + status filter; page /tasks"),
        steps: [
          t("يبحث برقم الفاتورة أو اسم المريض عبر GET /api/billing/invoices?patientId=&status=.", "Searches by invoice number or patient name via GET /api/billing/invoices?patientId=&status=."),
          t("يرى فواتير المريض في تايم لاين /patients/[id].", "Sees patient invoices in /patients/[id] timeline."),
          t("يدير المهام عبر /tasks (نفس كل الأدوار).", "Manages tasks via /tasks (same as all roles)."),
        ],
        backend: t("قراءة مفلترة للمؤسسة فقط.", "Org-scoped filtered reads."),
        result: t("الجداول المفلترة.", "Filtered tables."),
      },
    ],
    boundaries: [
      t("لا يرى الزيارات والتحاليل والروشتات والمخزون (الدكتور/الممرضة/الصيدلي).", "No encounters/labs/prescriptions/inventory (Doctor/Nurse/Pharmacist)."),
      t("لا يرى الطابور والاتصالات والانتظار (الاستقبال).", "No queue/communications/waitlist (Reception)."),
      t("باقات الجلسات في /catalogs — خارج موديولاته (للدكتور/الممرضة/الصيدلي).", "Session packages live in /catalogs — outside Biller modules (Doctor/Nurse/Pharmacist)."),
      t("إنشاء الكوبونات وإلغاء التقسيط وجدولة التقارير: API/مالك فقط.", "Coupon creation, installment cancel, report scheduling: API/Owner-only."),
      t("لا إعدادات/طاقم/تكاملات (المالك) ولا منصة السوبر.", "No settings/staff/integrations (Owner) and no Super platform."),
    ],
  },
  {
    id: "pharmacist",
    icon: "Pill",
    name: t("الصيدلي (Pharmacist)", "Pharmacist"),
    profile: t(
      "مسؤول الدواء والمخزون: يراجع الروشتات والتحاليل، ويدير الأصناف والمعدات والكتالوجات (عرض). يرى لوحة care-board العامة.",
      "Medication and stock owner: reviews prescriptions and labs, runs inventory, equipment and catalogs (view). Sees the general care-board.",
    ),
    landing: t(
      "لوحة /dashboard العامة (care-board) — لا فرع خاص بالصيدلي.",
      "General /dashboard care-board — no Pharmacist branch.",
    ),
    moduleSource: "rbac",
    roleKey: "Pharmacist",
    tasks: [
      {
        id: "pharm-rx",
        icon: "Pill",
        title: t("مراجعة الروشتات وإدارتها", "Review and manage prescriptions"),
        where: t("صفحة /prescriptions — الجدول والأزرار (ظاهرة دائمًا)", "Page /prescriptions — table and buttons (always rendered)"),
        steps: [
          t("يراجع القائمة والبحث والفلترة والطباعة عبر /print/prescription/[id].", "Reviews list, search, filters, and prints via /print/prescription/[id]."),
          t("أزرار الإكمال/الإلغاء/الحذف/الإنشاء تعمل فقط بمنح encounters:write/patients:write (وإلا 403 رغم ظهورها).", "Complete/cancel/delete/create buttons work only with encounters:write/patients:write grant (else 403 despite rendering)."),
        ],
        backend: t("الحماية: موديول labs (يملكه) + granular write للكتابة. تحذيرات حساسية + تدقيق.", "Guard: labs module (held) + granular write for mutations. Allergy warnings + audit."),
        result: t("الجدول أو 403 حسب المنح.", "Table refresh or 403 per grant."),
      },
      {
        id: "pharm-labs",
        icon: "FlaskConical",
        title: t("نتائج التحاليل: عرض وإضافة ومراجعة", "Lab results: view, add, review"),
        where: t("صفحة /labs — AddLabOrderDialog وAddLabResultDialog وLabOrdersSection والتصدير CSV", "Page /labs — AddLabOrderDialog, AddLabResultDialog, LabOrdersSection, CSV export"),
        steps: [
          t("يرى النتائج والطلبات والتمييز abnormal وروابط التقارير.", "Views results, orders, abnormal highlight, report links."),
          t("يضيف نتيجة/طلبًا بنفس حقول الدكتور — التنفيذ يتطلب encounters:write/patients:write.", "Adds results/orders with Doctor's fields — execution needs encounters:write/patients:write."),
          t("المراجعة قيمة status (reviewed/abnormal) — لا route مراجعة مستقل.", "Review is a status value (reviewed/abnormal) — no standalone review route."),
        ],
        backend: t("الحماية labs + granular. ربط الطلب بالمريض، وقلب resulted، مع تدقيق.", "labs + granular guard. Order-patient link, resulted flip, audit."),
        result: t("البطاقات أو 403 حسب المنح.", "Cards refresh or 403 per grant."),
      },
      {
        id: "pharm-inventory",
        icon: "Package",
        title: t("المخزون والمعدات", "Inventory and equipment"),
        where: t("صفحتا /inventory و/equipment — نفس الممرضة", "Pages /inventory and /equipment — same as Nurse"),
        steps: [
          t("الأصناف والحركات والتنبيهات (inventory:write للكتابة).", "Items, transactions, alerts (inventory:write for writes)."),
          t("المعدات وسجل الصيانة وشارات المعايرة.", "Equipment, maintenance log, calibration badges."),
        ],
        backend: t("نفس حماية الممرضة مع تدقيق.", "Same guard as Nurse, audited."),
        result: t("القوائم تتحدث (أو 403 بلا منح الكتابة).", "Lists refresh (or 403 without write grant)."),
      },
      {
        id: "pharm-catalogs",
        icon: "ClipboardList",
        title: t("الكتالوجات والمرضى والمهام (عرض أساسًا)", "Catalogs, patients, tasks (mostly view)"),
        where: t("صفحات /catalogs و/patients و/appointments و/tasks", "Pages /catalogs, /patients, /appointments, /tasks"),
        steps: [
          t("يرى الكتالوجات فقط — الإنشاء requireOwner.", "Views catalogs only — creation is requireOwner."),
          t("يرى المرضى والمواعيد (read) — الكتابة تتطلب منح :write.", "Views patients/appointments (read) — writes need :write grants."),
          t("المهام: إنشاء وإكمال بنفس كل الأدوار (مع المنح).", "Tasks: create/complete like all roles (with grants)."),
        ],
        backend: t("قراءات بالموديولات، وكتابة بالمنح الدقيقة + تدقيق.", "Module-scoped reads; granular-grant writes + audit."),
        result: t("القوائم.", "Lists."),
      },
    ],
    boundaries: [
      t("لا فوترة/مدفوعات/تأمين (Biller)، ولا زيارات (Doctor/Nurse)، ولا طابور/اتصالات (الاستقبال).", "No billing/payments/insurance (Biller), no encounters (Doctor/Nurse), no queue/comms (Reception)."),
      t("لا موافقات/تقارير مجدولة/تدقيق/توفر (ليست في موديولاته).", "No consents/scheduled-reports/audit/availability (outside modules)."),
      t("لا إعدادات/طاقم/تكاملات (المالك) ولا منصة السوبر.", "No settings/staff/integrations (Owner) and no Super platform."),
      t("أزرار الكتابة قد تظهر ثم ترد 403 حسب منح granular — تحقق مع المالك.", "Write buttons may render then 403 per granular grants — confirm with Owner."),
    ],
  },
  {
    id: "patient",
    icon: "Users",
    name: t("المريض (Patient)", "Patient"),
    profile: t(
      "مستخدم البوابة بحساب منفصل (email + MRN + password) وجلسة patient_session. يرى ملفه وفواتيره ومواعيده فقط — لا شيء للطاقم.",
      "Portal user with separate credentials (email + MRN + password) and patient_session. Sees only own file, bills and visits — nothing staff-side.",
    ),
    landing: t(
      "صفحة /patient-portal: الترحيب، 3 مواعيد قادمة، 3 تحاليل أخيرة، علامات حية، وروابط الحجز — GET /api/patient-portal/overview.",
      "Page /patient-portal: welcome, next 3 visits, last 3 labs, live vitals, booking links — GET /api/patient-portal/overview.",
    ),
    moduleSource: "custom",
    customModules: [
      { key: "overview", label: t("النظرة العامة", "Overview") },
      { key: "documents", label: t("مستنداتي", "My documents") },
      { key: "invoices", label: t("فواتيري ودفعها", "My invoices + pay") },
      { key: "visits", label: t("مواعيدي (إلغاء/تأجيل)", "My visits (cancel/reschedule)") },
      { key: "consents", label: t("موافقاتي", "My consents") },
      { key: "feedback", label: t("التقييم", "Feedback") },
      { key: "intake", label: t("نماذج الدخول", "Intake forms") },
      { key: "booking", label: t("الحجز العام (/book)", "Public booking (/book)") },
    ],
    tasks: [
      {
        id: "patient-login",
        icon: "Lock",
        title: t("تسجيل الدخول والخروج", "Login and logout"),
        where: t("صفحة /patient-login — حقول email وmrn وpassword", "Page /patient-login — email, mrn, password fields"),
        steps: [
          t("يدخل الثلاثة ويدوس الدخول فينفذ POST /api/patient-auth/login.", "Enters all three, submits, firing POST /api/patient-auth/login."),
          t("الموقوفة مؤسستها تُرفض (401). الجلسة 24 ساعة في كوكي patient_session.", "Suspended-org patients rejected (401). 24h session in patient_session cookie."),
          t("للخروج: POST /api/patient-auth/logout (إبطال + مسح الكوكي).", "To logout: POST /api/patient-auth/logout (revoke + clear cookie)."),
        ],
        backend: t("تحقق كلمة السر، فحص نشاط المؤسسة، إنشاء جلسة + تدقيق CREATE PatientSession.", "Password verify, org-active check, session create + CREATE PatientSession audit."),
        result: t("الانتقال لـ /patient-portal أو /patient-login عند الفشل.", "Redirect to /patient-portal, or /patient-login on failure."),
      },
      {
        id: "patient-bills",
        icon: "CreditCard",
        title: t("عرض الفواتير والدفع أونلاين", "View invoices and pay online"),
        where: t("بطاقة الفواتير — payNow (CreditCard) لكل رصيد موجب", "Invoices card — payNow (CreditCard) per positive balance"),
        steps: [
          t("يرى فواتيره عبر GET /api/patient-portal/invoices (رقم/حالة/رصيد).", "Views own invoices via GET /api/patient-portal/invoices (number/status/balance)."),
          t("يدوس payNow فينفذ POST /api/patient-portal/payments بالـ {invoiceId} فيُحوَّل لـ Stripe Checkout.", "Clicks payNow, firing POST /api/patient-portal/payments with {invoiceId}; redirected to Stripe Checkout."),
        ],
        backend: t("فحص الملكية والرصيد (المدفوعة 400)، إنشاء checkout + دفعة pending + تدقيق actorType:patient. يتطلب STRIPE_SECRET_KEY (وإلا 503).", "Ownership + balance check (paid → 400), checkout create + pending payment + actorType:patient audit. Needs STRIPE_SECRET_KEY (else 503)."),
        result: t("العودة ?paid=1 أو ?cancelled=1.", "Return to ?paid=1 or ?cancelled=1."),
      },
      {
        id: "patient-visits",
        icon: "CalendarDays",
        title: t("إلغاء موعد وتأجيله", "Cancel and reschedule a visit"),
        where: t("بطاقة المواعيد — portal_cancelAppointment وportal_reschedule", "Appointments card — portal_cancelAppointment and portal_reschedule"),
        steps: [
          t("للإلغاء (مواعيد scheduled/confirmed المستقبلية): تأكيد ثم POST …/cancel.", "To cancel (future scheduled/confirmed): confirm, then POST …/cancel."),
          t("للتأجيل: يختار تاريخًا (GET /api/book/[orgSlug]/availability) ثم slot ثم portal_confirmBooking فينفذ PATCH …/reschedule بالـ {startTime}.", "To reschedule: picks a date (GET /api/book/[orgSlug]/availability), then a slot, then portal_confirmBooking fires PATCH …/reschedule with {startTime}."),
        ],
        backend: t("فحص الملكية والمستقبل والحالة (canPatientCancel/Reschedule) — بلا حد ساعات في الكود. التعارض 409، والخانة القديمة تُعرض على الانتظار + تدقيق.", "Ownership/future/status checks (no hour cutoff in code). Conflict 409; old slot offered to waitlist + audit."),
        result: t("الحالة تتحدث + toast.", "Status refreshes + toast."),
      },
      {
        id: "patient-consents",
        icon: "FileCheck2",
        title: t("الموافقات: قبول/رفض", "Consents: accept/decline"),
        where: t("بطاقة الموافقات — portal_accept وportal_decline", "Consents card — portal_accept and portal_decline"),
        steps: [
          t("يختار Accept/Decline فينفذ POST /api/patient-portal/consents بالـ {consentType: treatment|data_usage|hipaa, isGranted}.", "Clicks Accept/Decline, firing POST /api/patient-portal/consents with {consentType, isGranted}."),
        ],
        backend: t("إنشاء سجل موقع الآن + تدقيق actorType:patient. الأحدث يسود.", "Timestamped record create + actorType:patient audit. Latest wins."),
        result: t("الحالة (موقّع/معلق) تتحدث.", "Status (signed/pending) refreshes."),
      },
      {
        id: "patient-feedback",
        icon: "Star",
        title: t("تقييم زيارة", "Rate a visit"),
        where: t("بطاقة التقييم — نجوم + portal_rateSubmit (للمكتملة غير المقيّمة)", "Rating card — stars + portal_rateSubmit (completed, unrated only)"),
        steps: [
          t("يختار 1-5 نجوم وتعليقًا ويدوس portal_rateSubmit فينفذ POST /api/patient-portal/feedback.", "Picks 1-5 stars + comment, clicks portal_rateSubmit, firing POST /api/patient-portal/feedback."),
        ],
        backend: t("زياراته المكتملة خلال 90 يومًا فقط، وتقييم واحد لكل زيارة (التكرار 200 alreadyRated).", "Own completed visits within 90 days only; one rating per visit (dup → 200 alreadyRated)."),
        result: t("toast portal_rateThanks.", "portal_rateThanks toast."),
      },
      {
        id: "patient-intake",
        icon: "ClipboardList",
        title: t("ملء نماذج الدخول", "Fill intake forms"),
        where: t("بطاقة PortalIntakeCard — حقول حسب النوع وزرار portal_intakeSubmit", "PortalIntakeCard — per-kind fields and portal_intakeSubmit button"),
        steps: [
          t("يملأ الحقول (نص/رقم/تاريخ/اختيار) ويدوس Submit فينفذ POST /api/patient-portal/intake بالـ {formId, answers}.", "Fills fields (text/number/date/choice), submits via POST /api/patient-portal/intake with {formId, answers}."),
        ],
        backend: t("النماذج النشطة فقط، والإلزامي يُفرض خادميًا (400 عند النقص).", "Active forms only; required answers server-enforced (400 if missing)."),
        result: t("النموذج المُسلَّم يختفي.", "Submitted form disappears."),
      },
      {
        id: "patient-book",
        icon: "CalendarPlus",
        title: t("الحجز العام بدون حساب طاقم", "Public self-booking"),
        where: t("صفحة /book/[orgSlug] — اختيار الدكتور والتاريخ والخانة والتأكيد", "Page /book/[orgSlug] — provider/date/slot pick and confirm"),
        steps: [
          t("يختار الدكتور والتاريخ (GET …/availability حتى +60 يومًا) ثم الخانة.", "Picks provider and date (GET …/availability up to +60d), then a slot."),
          t("يؤكد فينفذ POST …/appointments بالـ {providerId, startTime, depositAmount?}.", "Confirms via POST …/appointments with {providerId, startTime, depositAmount?}."),
        ],
        backend: t("يلزم جلسة مريض بنفس المؤسسة وغير مؤرشف. التعارض 409. العربون ينشئ فاتورة sent في نفس المعاملة.", "Needs same-org, non-archived patient session. Conflict 409. Deposit creates a sent invoice in the same transaction."),
        result: t("الموعد + (عربون مستحق الدفع عبر B10).", "Appointment + (deposit payable via B10)."),
      },
      {
        id: "patient-docs",
        icon: "FileText",
        title: t("مستنداتي ونتائج تحاليلي", "My documents and lab results"),
        where: t("بطاقتا المستندات والتحاليل (عرض فقط)", "Documents and labs cards (view-only)"),
        steps: [
          t("يرى ملفاته الخمسين الأحدث (GET /api/patient-portal/documents).", "Views 50 most recent own files (GET /api/patient-portal/documents)."),
          t("يرى 3 نتائج أخيرة في النظرة العامة.", "Sees last 3 results in overview."),
        ],
        backend: t("ملكية صارمة (patientId الجلسة فقط).", "Strict ownership (session patientId only)."),
        result: t("القوائم.", "Lists."),
      },
    ],
    boundaries: [
      t("5 تبويبات معطلة بـ portal_comingSoon: الحجز بلا slug، السجلات الطبية، مراسلة الدكتور، الملخص الصحي، تعديل البروفايل.", "5 tabs disabled with portal_comingSoon: booking without slug, medical records, message provider, health summary, edit profile."),
      t("لا يصل لأي route طاقم — جلسة المريض لا تمنح صلاحيات staff.", "Reaches no staff route — patient session grants no staff permissions."),
      t("الموقوفة مؤسستها والمؤرشف: رفض دخول وحجز.", "Suspended-org and archived patients: login and booking rejected."),
    ],
  },
];





