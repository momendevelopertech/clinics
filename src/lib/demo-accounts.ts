export type DemoAccount = {
  role: string;
  roleKey: string;
  email: string;
};

export type DemoTenant = {
  name: string;
  city: string;
  accounts: DemoAccount[];
};

export const DEMO_PASSWORD = "DemoClinic!2026";

export const LOCAL_SEED_ORG = "acmeclinic";
export const LOCAL_SEED_PASSWORD = "admin123";

export const DEMO_TENANTS: DemoTenant[] = [
  {
    name: "عيادة الأسرة بالإسكندرية — Alexandria Family Clinic",
    city: "سيدي جابر، الإسكندرية، مصر",
    accounts: [
      { role: "Owner", roleKey: "auth_demoOwner", email: "owner@alexandria.demo.openhealthcrm.test" },
      { role: "Doctor", roleKey: "auth_demoDoctor", email: "doctor@alexandria.demo.openhealthcrm.test" },
      { role: "Receptionist", roleKey: "auth_demoReceptionist", email: "reception@alexandria.demo.openhealthcrm.test" },
      { role: "Nurse", roleKey: "auth_demoNurse", email: "nurse@alexandria.demo.openhealthcrm.test" },
      { role: "Biller", roleKey: "auth_demoBiller", email: "biller@alexandria.demo.openhealthcrm.test" },
      { role: "Pharmacist", roleKey: "auth_demoPharmacist", email: "pharmacist@alexandria.demo.openhealthcrm.test" },
    ],
  },
  {
    name: "مركز سموحة لطب الأطفال — Smouha Pediatrics Center",
    city: "سموحة، الإسكندرية، مصر",
    accounts: [
      { role: "Owner", roleKey: "auth_demoOwner", email: "owner@smouha.demo.openhealthcrm.test" },
      { role: "Doctor", roleKey: "auth_demoDoctor", email: "doctor@smouha.demo.openhealthcrm.test" },
      { role: "Receptionist", roleKey: "auth_demoReceptionist", email: "reception@smouha.demo.openhealthcrm.test" },
      { role: "Nurse", roleKey: "auth_demoNurse", email: "nurse@smouha.demo.openhealthcrm.test" },
      { role: "Biller", roleKey: "auth_demoBiller", email: "biller@smouha.demo.openhealthcrm.test" },
      { role: "Pharmacist", roleKey: "auth_demoPharmacist", email: "pharmacist@smouha.demo.openhealthcrm.test" },
    ],
  },
];

export const LOCAL_SEED_ACCOUNTS: DemoAccount[] = [
  { role: "Super Admin", roleKey: "auth_demoSuperAdmin", email: "superadmin@acmeclinic.com" },
  { role: "Doctor", roleKey: "auth_demoDoctor", email: "admin@acmeclinic.com" },
  { role: "Pediatrician", roleKey: "auth_demoDoctor2", email: "dr.fatma@acmeclinic.com" },
  { role: "Owner", roleKey: "auth_demoOwner", email: "owner@acmeclinic.com" },
  { role: "Care Coordinator", roleKey: "auth_demoCoordinator", email: "ops@acmeclinic.com" },
  { role: "Receptionist", roleKey: "auth_demoReceptionist", email: "receptionist@acmeclinic.com" },
  { role: "Biller", roleKey: "auth_demoBiller", email: "billing@acmeclinic.com" },
  { role: "Nurse", roleKey: "auth_demoNurse", email: "nurse@acmeclinic.com" },
  { role: "Pharmacist", roleKey: "auth_demoPharmacist", email: "pharmacist@acmeclinic.com" },
];