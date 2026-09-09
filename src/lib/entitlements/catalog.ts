import { CLINIC_MODULE_KEYS } from "@/lib/entitlements/module-names";

export const PREMIUM_MODULES = new Set([
  "billing",
  "payments",
  "communications",
  "campaigns",
  "automation",
]);

export type ModuleDef = {
  key: string;
  labelKey: string;
  group: string;
  premium?: boolean;
  order: number;
};

export type FeatureDef = {
  key: string;
  labelKey: string;
  group: string;
  kind: "feature" | "limit";
  premium?: boolean;
  upgradeMessageKey?: string;
};

export const MODULE_GROUPS: Record<string, string> = {
  overview: "mtr_groupOverview",
  clinical: "mtr_groupClinical",
  operations: "mtr_groupOperations",
  billing: "mtr_groupBilling",
  growth: "mtr_groupGrowth",
  system: "mtr_groupSystem",
};

const MODULE_ORDER: Record<string, number> = {
  dashboard: 1,
  patients: 2,
  appointments: 3,
  queue: 4,
  encounters: 5,
  waitlist: 6,
  analytics: 7,
  consents: 8,
  labs: 9,
  inventory: 10,
  tasks: 11,
  documents: 12,
  billing: 13,
  payments: 14,
  communications: 15,
  campaigns: 16,
  automation: 17,
  reports: 18,
  catalogs: 19,
  availability: 20,
  locations: 21,
  audit: 22,
  settings: 23,
  plan: 24,
  help: 25,
};

export const MODULE_GROUPS_DEF: Record<string, ModuleDef> = Object.fromEntries(
  CLINIC_MODULE_KEYS.map((key) => {
    let group = "system";
    if (["dashboard", "patients", "appointments", "analytics", "reports", "audit", "help", "plan"].includes(key)) {
      group = "overview";
    } else if (["queue", "encounters", "waitlist", "consents"].includes(key)) {
      group = "clinical";
    } else if (["labs", "inventory", "tasks", "documents", "catalogs", "availability", "locations"].includes(key)) {
      group = "operations";
    } else if (["billing", "payments"].includes(key)) {
      group = "billing";
    } else if (["communications", "campaigns", "automation"].includes(key)) {
      group = "growth";
    }
    return [
      key,
      {
        key,
        labelKey: `nav_${key}`,
        group,
        premium: PREMIUM_MODULES.has(key),
        order: MODULE_ORDER[key] ?? 99,
      } satisfies ModuleDef,
    ];
  }),
) as Record<string, ModuleDef>;

export const MODULE_DEFS = MODULE_GROUPS_DEF;

export const FEATURE_DEFS: Record<string, FeatureDef> = {
  patients: { key: "patients", labelKey: "mtr_patients", group: "clinical", kind: "limit" },
  staff: { key: "staff", labelKey: "mtr_staff", group: "system", kind: "limit" },
  doctors: { key: "doctors", labelKey: "mtr_doctors", group: "system", kind: "limit" },
  appointments_month: { key: "appointments_month", labelKey: "mtr_appointments", group: "clinical", kind: "limit" },
  storage_gb: { key: "storage_gb", labelKey: "mtr_storage", group: "system", kind: "limit" },
  crm: { key: "crm", labelKey: "mtr_crm", group: "growth", kind: "feature", premium: true },
  campaigns: { key: "campaigns", labelKey: "mtr_campaigns", group: "growth", kind: "feature", premium: true, upgradeMessageKey: "mtr_upgradeCampaigns" },
  automation: { key: "automation", labelKey: "mtr_automation", group: "growth", kind: "feature", premium: true, upgradeMessageKey: "mtr_upgradeAutomation" },
  basic_reports: { key: "basic_reports", labelKey: "mtr_basicReports", group: "overview", kind: "feature" },
  advanced_reports: { key: "advanced_reports", labelKey: "mtr_advancedReports", group: "overview", kind: "feature", premium: true },
  financial_reports: { key: "financial_reports", labelKey: "mtr_financialReports", group: "billing", kind: "feature", premium: true },
  patient_portal: { key: "patient_portal", labelKey: "mtr_patientPortal", group: "growth", kind: "feature", premium: true },
  online_booking: { key: "online_booking", labelKey: "mtr_onlineBooking", group: "growth", kind: "feature", premium: true },
  sms_reminders: { key: "sms_reminders", labelKey: "mtr_smsReminders", group: "growth", kind: "feature", premium: true },
  email_reminders: { key: "email_reminders", labelKey: "mtr_emailReminders", group: "growth", kind: "feature", premium: true },
  multi_branch: { key: "multi_branch", labelKey: "mtr_multiBranch", group: "system", kind: "feature", premium: true },
  audit_trail: { key: "audit_trail", labelKey: "mtr_auditTrail", group: "system", kind: "feature" },
  priority_support: { key: "priority_support", labelKey: "mtr_prioritySupport", group: "system", kind: "feature", premium: true },
};

export const LIMIT_KEYS = ["patients", "staff", "doctors", "appointments_month", "storage_gb"] as const;

export const FEATURE_ORDER = Object.keys(FEATURE_DEFS);
export const MODULE_ORDER_KEYS = Object.keys(MODULE_DEFS).sort(
  (a, b) => (MODULE_DEFS[a].order ?? 99) - (MODULE_DEFS[b].order ?? 99),
);