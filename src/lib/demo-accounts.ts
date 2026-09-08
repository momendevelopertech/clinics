export const DEMO_TENANTS = [
  {
    name: "Harborview Family Clinic",
    city: "Seattle, United States",
    accounts: [
      { role: "Owner", email: "owner@harborview.demo.openhealthcrm.test" },
      { role: "Doctor", email: "doctor@harborview.demo.openhealthcrm.test" },
      { role: "Receptionist", email: "reception@harborview.demo.openhealthcrm.test" },
      { role: "Nurse", email: "nurse@harborview.demo.openhealthcrm.test" },
      { role: "Biller", email: "biller@harborview.demo.openhealthcrm.test" },
      { role: "Pharmacist", email: "pharmacist@harborview.demo.openhealthcrm.test" },
    ],
  },
  {
    name: "Northstar Wellness & Pediatrics",
    city: "Denver, United States",
    accounts: [
      { role: "Owner", email: "owner@northstar.demo.openhealthcrm.test" },
      { role: "Doctor", email: "doctor@northstar.demo.openhealthcrm.test" },
      { role: "Receptionist", email: "reception@northstar.demo.openhealthcrm.test" },
      { role: "Nurse", email: "nurse@northstar.demo.openhealthcrm.test" },
      { role: "Biller", email: "biller@northstar.demo.openhealthcrm.test" },
      { role: "Pharmacist", email: "pharmacist@northstar.demo.openhealthcrm.test" },
    ],
  },
] as const;

export const DEMO_PASSWORD = "DemoClinic!2026";
