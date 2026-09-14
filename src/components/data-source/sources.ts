/**
 * Data Source Navigator registry (Phase B).
 * Each key maps a consumer field to the screen that owns its source of truth.
 * `pageRoles` mirrors proxy.ts CLINIC_PAGE_ACCESS so links stay permission-aware.
 */

export type SourceKey =
  | "medication-stock"
  | "prescription-template"
  | "service-catalog"
  | "clinical-catalog"
  | "insurance-provider";

export const DATA_SOURCES: Record<
  SourceKey,
  { href: string; pageRoles?: string[]; managerLabel: string }
> = {
  // Drugs picked in the Rx composer come from org InventoryItem rows
  // managed on /inventory by Nurse/Pharmacist (+Owner).
  "medication-stock": {
    href: "/inventory",
    pageRoles: ["Nurse", "Pharmacist"],
    managerLabel: "Nurse / Pharmacist",
  },
  // Rx templates are created inside the composer dialog itself and shared
  // org-wide; privacy enforced server-side (G22). No separate page.
  "prescription-template": {
    href: "/prescriptions",
    pageRoles: ["Doctor", "Nurse", "Pharmacist"],
    managerLabel: "Doctor",
  },
  // Invoice lines must pick an Owner-managed service from /catalogs.
  "service-catalog": {
    href: "/catalogs",
    pageRoles: ["Doctor", "Nurse", "Pharmacist"],
    managerLabel: "Owner",
  },
  // Lab tests / diagnosis codes come from the Owner-managed clinical catalog.
  "clinical-catalog": {
    href: "/catalogs",
    pageRoles: ["Doctor", "Nurse", "Pharmacist"],
    managerLabel: "Owner",
  },
  // Policy provider names come from the Owner-managed provider list
  // (G23), maintained on /insurance itself.
  "insurance-provider": {
    href: "/insurance",
    pageRoles: ["Biller"],
    managerLabel: "Owner",
  },
};
