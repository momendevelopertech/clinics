/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-off additive seed for the two public demo tenants.
 *
 * This is intentionally separate from prisma/seed.js. It never deletes rows and
 * uses stable demo slugs, emails, MRNs, idempotency keys, and content markers.
 */
require("dotenv").config();

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const DEMO_PASSWORD = "DemoClinic!2026";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

function dateFromNow(days, hour = 10) {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  value.setDate(value.getDate() + days);
  return value;
}

async function findOrCreate(model, where, data) {
  const existing = await prisma[model].findFirst({ where });
  return existing || prisma[model].create({ data });
}

async function ensureRole(orgId, name, modules) {
  const role = await findOrCreate(
    "role",
    { organizationId: orgId, name },
    { organizationId: orgId, name },
  );

  const permissions = new Set();
  for (const moduleName of modules) {
    permissions.add(`${moduleName}:read`);
    permissions.add(`${moduleName}:write`);
  }
  for (const action of permissions) {
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: role.id, action, resource: action.split(":")[0] },
    });
    if (!exists) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, action, resource: action.split(":")[0] },
      });
    }
  }
  return role;
}

async function ensureUser(orgId, branchId, role, account, passwordHash) {
  const user = await prisma.user.upsert({
    where: { email: account.email },
    update: {
      organizationId: orgId,
      branchId,
      name: account.name,
      passwordHash,
      role: account.denormalizedRole,
      active: true,
      emailVerified: true,
      specialty: account.specialty || null,
      licenseNumber: account.licenseNumber || null,
    },
    create: {
      organizationId: orgId,
      branchId,
      email: account.email,
      name: account.name,
      passwordHash,
      role: account.denormalizedRole,
      active: true,
      emailVerified: true,
      specialty: account.specialty || null,
      licenseNumber: account.licenseNumber || null,
    },
  });

  const userRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: role.id },
  });
  if (!userRole) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return user;
}

async function ensurePatient(orgId, clinic, index, data) {
  return prisma.patient.upsert({
    where: { mrn: `DM-${clinic.slug}-${String(index).padStart(3, "0")}` },
    update: {
      organizationId: orgId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      email: `${clinic.slug}.patient${index}@example.test`,
      phone: data.phone,
      city: clinic.city,
      country: clinic.country,
      bloodType: data.bloodType,
      allergies: data.allergies,
      primaryCareProvider: data.primaryCareProvider,
      familyHistory: data.familyHistory,
      status: "Active",
    },
    create: {
      organizationId: orgId,
      mrn: `DM-${clinic.slug}-${String(index).padStart(3, "0")}`,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      email: `${clinic.slug}.patient${index}@example.test`,
      phone: data.phone,
      city: clinic.city,
      country: clinic.country,
      bloodType: data.bloodType,
      allergies: data.allergies,
      primaryCareProvider: data.primaryCareProvider,
      familyHistory: data.familyHistory,
      status: "Active",
    },
  });
}

async function seedClinic(clinic) {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const org = await prisma.organization.upsert({
    where: { slug: clinic.slug },
    update: {
      name: clinic.name,
      status: "active",
      plan: "clinic",
      onboardingSource: "manual",
      phone: clinic.phone,
      address: clinic.address,
      city: clinic.city,
      country: clinic.country,
      timezone: clinic.timezone,
      currency: clinic.currency,
      settingsJson: JSON.stringify({ appointmentDurationMins: 30, openTime: "08:00", closeTime: "18:00" }),
    },
    create: {
      name: clinic.name,
      slug: clinic.slug,
      status: "active",
      plan: "clinic",
      onboardingSource: "manual",
      phone: clinic.phone,
      address: clinic.address,
      city: clinic.city,
      country: clinic.country,
      timezone: clinic.timezone,
      currency: clinic.currency,
      settingsJson: JSON.stringify({ appointmentDurationMins: 30, openTime: "08:00", closeTime: "18:00" }),
    },
  });

  const branch = await findOrCreate(
    "branch",
    { organizationId: org.id, name: `${clinic.name} Main Campus` },
    {
      organizationId: org.id,
      name: `${clinic.name} Main Campus`,
      address: clinic.address,
      city: clinic.city,
      country: clinic.country,
      phone: clinic.phone,
      status: "active",
      workingHours: JSON.stringify({ mon: { open: "08:00", close: "18:00" }, tue: { open: "08:00", close: "18:00" }, wed: { open: "08:00", close: "18:00" }, thu: { open: "08:00", close: "18:00" }, fri: { open: "08:00", close: "16:00" } }),
    },
  );
  const room = await findOrCreate(
    "room",
    { organizationId: org.id, name: `${clinic.slug} Consultation Room 1` },
    { organizationId: org.id, branchId: branch.id, name: `${clinic.slug} Consultation Room 1`, number: "101", type: "consultation", status: "active" },
  );

  const moduleSets = {
    Owner: ["dashboard", "patients", "appointments", "queue", "encounters", "analytics", "consents", "audit", "labs", "tasks", "documents", "reports", "availability", "catalogs", "communications", "locations", "waitlist", "billing", "payments", "inventory", "automation", "campaigns", "settings", "plan", "help"],
    Doctor: ["dashboard", "patients", "appointments", "queue", "encounters", "analytics", "consents", "labs", "tasks", "documents", "reports", "availability", "catalogs", "help"],
    "Care Coordinator": ["dashboard", "patients", "appointments", "queue", "consents", "tasks", "documents", "communications", "locations", "waitlist", "help"],
    Nurse: ["dashboard", "patients", "appointments", "encounters", "analytics", "consents", "labs", "inventory", "tasks", "documents", "reports", "availability", "catalogs", "help"],
    Biller: ["dashboard", "patients", "appointments", "analytics", "billing", "payments", "tasks", "reports", "help"],
    Pharmacist: ["dashboard", "patients", "appointments", "labs", "inventory", "tasks", "catalogs", "help"],
  };
  const roles = {};
  for (const [name, modules] of Object.entries(moduleSets)) roles[name] = await ensureRole(org.id, name, modules);

  const accountDefinitions = [
    ["owner", "Owner", "owner", "Avery Morgan"],
    ["doctor", "Doctor", "doctor", `Dr. ${clinic.doctorName}`],
    ["reception", "Care Coordinator", "receptionist", clinic.coordinatorName],
    ["nurse", "Nurse", "nurse", clinic.nurseName],
    ["biller", "Biller", "biller", clinic.billerName],
    ["pharmacist", "Pharmacist", "pharmacist", clinic.pharmacistName],
  ];
  const users = {};
  for (const [key, roleName, denormalizedRole, name] of accountDefinitions) {
    const email = `${key}@${clinic.emailDomain}`;
    users[key] = await ensureUser(
      org.id,
      branch.id,
      roles[roleName],
      { email, name, denormalizedRole, specialty: roleName === "Doctor" ? clinic.specialty : undefined, licenseNumber: roleName === "Doctor" ? `DEMO-${clinic.slug}-MD` : undefined },
      passwordHash,
    );
  }

  const patients = [];
  for (let index = 1; index <= 4; index += 1) {
    patients.push(await ensurePatient(org.id, clinic, index, clinic.patients[index - 1]));
  }

  const services = {};
  for (const service of [
    ["CONSULT", "Comprehensive consultation", "consultation", "125.00"],
    ["FOLLOWUP", "Follow-up visit", "consultation", "85.00"],
    ["LAB-CBC", "Complete blood count", "laboratory", "45.00"],
  ]) {
    services[service[0]] = await prisma.serviceCatalog.upsert({
      where: { organizationId_code: { organizationId: org.id, code: service[0] } },
      update: { name: service[1], category: service[2], price: service[3], active: true },
      create: { organizationId: org.id, code: service[0], name: service[1], category: service[2], price: service[3], active: true },
    });
  }
  await prisma.clinicalCatalog.upsert({
    where: { organizationId_system_code: { organizationId: org.id, system: "ICD-10", code: "I10" } },
    update: { name: "Essential hypertension", category: "diagnosis", active: true },
    create: { organizationId: org.id, system: "ICD-10", code: "I10", name: "Essential hypertension", category: "diagnosis", active: true },
  });

  const pastAppointment = await prisma.appointment.upsert({
    where: { idempotencyKey: `demo:${clinic.slug}:appointment:past` },
    update: { status: "completed", notes: "Demo completed visit", providerId: users.doctor.id, patientId: patients[0].id, branchId: branch.id, roomId: room.id },
    create: { organizationId: org.id, patientId: patients[0].id, providerId: users.doctor.id, branchId: branch.id, roomId: room.id, startTime: dateFromNow(-14, 10), endTime: dateFromNow(-14, 10.5), appointmentType: "consultation", status: "completed", notes: "Demo completed visit", idempotencyKey: `demo:${clinic.slug}:appointment:past` },
  });
  await prisma.appointment.upsert({
    where: { idempotencyKey: `demo:${clinic.slug}:appointment:upcoming` },
    update: { status: "scheduled", providerId: users.doctor.id, patientId: patients[1].id, branchId: branch.id, roomId: room.id },
    create: { organizationId: org.id, patientId: patients[1].id, providerId: users.doctor.id, branchId: branch.id, roomId: room.id, startTime: dateFromNow(7, 14), endTime: dateFromNow(7, 14.5), appointmentType: "follow-up", status: "scheduled", notes: "Review care plan and lab results", idempotencyKey: `demo:${clinic.slug}:appointment:upcoming` },
  });

  const encounter = await findOrCreate(
    "encounter",
    { organizationId: org.id, appointmentId: pastAppointment.id },
    { organizationId: org.id, patientId: patients[0].id, appointmentId: pastAppointment.id, startTime: dateFromNow(-14, 10), endTime: dateFromNow(-14, 10.5), status: "completed", encounterType: "office_visit" },
  );
  await findOrCreate("encounterNote", { encounterId: encounter.id, text: `Demo note:${clinic.slug}:past` }, {
    encounterId: encounter.id, authorId: users.doctor.id, noteType: "SOAP",
    subjective: "Patient reports intermittent headaches for two weeks.",
    objective: "BP 138/88, pulse 76, no acute distress.",
    assessment: "Likely stress-related headache; monitor blood pressure.",
    plan: "Hydration, sleep hygiene, follow-up in two weeks.",
    text: `Demo note:${clinic.slug}:past`,
  });
  await findOrCreate("vital", { patientId: patients[0].id, encounterId: encounter.id }, {
    patientId: patients[0].id, encounterId: encounter.id, weightKg: 72, heightCm: 174, bloodPressureSystolic: 138, bloodPressureDiastolic: 88, heartRate: 76, bmi: 23.8, spO2: 98, temperature: 36.7,
  });
  await findOrCreate("diagnosis", { organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, code: "I10" }, {
    organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, system: "ICD-10", code: "I10", name: "Essential hypertension", notes: "Demo diagnosis", status: "active",
  });

  const labOrder = await findOrCreate("labOrder", { organizationId: org.id, patientId: patients[0].id, testName: "Complete blood count", indication: `Demo:${clinic.slug}:cbc` }, {
    organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, orderedById: users.doctor.id, orderType: "lab", testName: "Complete blood count", priority: "routine", indication: `Demo:${clinic.slug}:cbc`, status: "resulted",
  });
  await findOrCreate("labResult", { organizationId: org.id, orderId: labOrder.id, testName: "Hemoglobin" }, {
    organizationId: org.id, patientId: patients[0].id, orderId: labOrder.id, testName: "Hemoglobin", resultValue: "13.8", unit: "g/dL", referenceRange: "12.0-16.0", status: "completed", performedAt: dateFromNow(-12), reviewedById: users.doctor.id, reviewedAt: dateFromNow(-11), reviewNote: "Demo result reviewed.",
  });
  const prescription = await prisma.prescription.upsert({
    where: { idempotencyKey: `demo:${clinic.slug}:prescription:1` },
    update: { patientId: patients[0].id, encounterId: encounter.id, prescribedById: users.doctor.id, status: "active" },
    create: { organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, prescribedById: users.doctor.id, medicationName: "Amlodipine 5 mg", dosage: "5 mg", frequency: "Once daily", duration: "30 days", instructions: "Take after breakfast.", status: "active", idempotencyKey: `demo:${clinic.slug}:prescription:1` },
  });
  await findOrCreate("prescriptionItem", { prescriptionId: prescription.id, medicationName: "Amlodipine 5 mg" }, {
    prescriptionId: prescription.id, medicationName: "Amlodipine 5 mg", dosage: "5 mg", frequency: "Once daily", duration: "30 days", instructions: "Take after breakfast.",
  });

  for (const [index, patient] of patients.slice(0, 2).entries()) {
    const invoiceNumber = `DM-${clinic.slug.toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber },
      update: { patientId: patient.id, status: index === 0 ? "paid" : "overdue", totalAmount: index === 0 ? "125.00" : "170.00", amountPaid: index === 0 ? "125.00" : "0.00", dueDate: dateFromNow(index === 0 ? -7 : -2) },
      create: { organizationId: org.id, patientId: patient.id, invoiceNumber, currency: clinic.currency, status: index === 0 ? "paid" : "overdue", totalAmount: index === 0 ? "125.00" : "170.00", amountPaid: index === 0 ? "125.00" : "0.00", dueDate: dateFromNow(index === 0 ? -7 : -2), idempotencyKey: `demo:${clinic.slug}:invoice:${index + 1}` },
    });
    await findOrCreate("invoiceLineItem", { invoiceId: invoice.id, description: `Demo consultation:${clinic.slug}:${index + 1}` }, {
      invoiceId: invoice.id, serviceCatalogId: services.CONSULT.id, description: `Demo consultation:${clinic.slug}:${index + 1}`, quantity: 1, unitPrice: index === 0 ? "125.00" : "125.00", amount: "125.00", encounterId: index === 0 ? encounter.id : null,
    });
    if (index === 0) {
      await findOrCreate("payment", { invoiceId: invoice.id, amount: "125.00", status: "completed" }, { invoiceId: invoice.id, amount: "125.00", paymentMethod: "card", status: "completed" });
    }
  }

  for (const item of [
    ["Amlodipine 5 mg", "MED-AML-5", "medication", 84, 20],
    ["Disposable gloves", "SUP-GLOVE-M", "consumable", 240, 50],
  ]) {
    const inventory = await findOrCreate("inventoryItem", { organizationId: org.id, sku: item[1] }, {
      organizationId: org.id, name: item[0], sku: item[1], category: item[2], quantity: item[3], reorderLevel: item[4], unit: "box",
    });
    await findOrCreate("inventoryTransaction", { itemId: inventory.id, reason: `Demo restock:${clinic.slug}` }, { itemId: inventory.id, type: "restock", quantity: item[3], reason: `Demo restock:${clinic.slug}` });
  }

  await findOrCreate("task", { organizationId: org.id, title: `Demo lab review:${clinic.slug}` }, {
    organizationId: org.id, title: `Demo lab review:${clinic.slug}`, description: "Review the completed CBC and confirm the patient follow-up.", status: "open", priority: "high", dueDate: dateFromNow(2), patientId: patients[0].id, assigneeId: users.nurse.id, creatorId: users.doctor.id, taskType: "lab_review",
  });
  await findOrCreate("waitlistEntry", { organizationId: org.id, patientId: patients[2].id, notes: `Demo waitlist:${clinic.slug}` }, {
    organizationId: org.id, patientId: patients[2].id, preferredDate: dateFromNow(10), notes: `Demo waitlist:${clinic.slug}`, status: "waiting",
  });
  await findOrCreate("consent", { patientId: patients[0].id, consentType: "treatment" }, {
    patientId: patients[0].id, organizationId: org.id, consentType: "treatment", isGranted: true, signedAt: dateFromNow(-14),
  });
  await findOrCreate("document", { organizationId: org.id, name: `Demo CBC report:${clinic.slug}` }, {
    organizationId: org.id, patientId: patients[0].id, name: `Demo CBC report:${clinic.slug}`, type: "lab_report", storageKey: `demo/${clinic.slug}/cbc-report.pdf`, mimeType: "application/pdf",
  });
  await findOrCreate("communication", { organizationId: org.id, patientId: patients[1].id, content: `Demo reminder:${clinic.slug}` }, {
    organizationId: org.id, patientId: patients[1].id, channel: "email", type: "reminder", status: "sent", content: `Demo reminder:${clinic.slug}`, scheduledFor: dateFromNow(5), sentAt: dateFromNow(-1),
  });
  await findOrCreate("campaign", { organizationId: org.id, name: `Demo wellness recall:${clinic.slug}` }, {
    organizationId: org.id, name: `Demo wellness recall:${clinic.slug}`, type: "broadcast", status: "draft", triggerType: "chronic_care",
  });

  return { name: clinic.name, orgId: org.id, accounts: accountDefinitions.map(([key, roleName]) => ({ role: roleName, email: `${key}@${clinic.emailDomain}` })) };
}

const clinics = [
  {
    name: "Harborview Family Clinic",
    slug: "demo-harborview-family-clinic",
    emailDomain: "harborview.demo.openhealthcrm.test",
    city: "Seattle",
    country: "United States",
    timezone: "America/Los_Angeles",
    currency: "USD",
    phone: "+1 206 555 0148",
    address: "1420 Harbor Avenue, Seattle, WA",
    doctorName: "Elena Brooks",
    coordinatorName: "Maya Patel",
    nurseName: "Jordan Lee",
    billerName: "Noah Williams",
    pharmacistName: "Priya Shah",
    specialty: "Family Medicine",
    patients: [
      { firstName: "Olivia", lastName: "Carter", dateOfBirth: "1987-04-18", gender: "Female", phone: "+1 206 555 1101", bloodType: "O+", allergies: "Penicillin", primaryCareProvider: "Dr. Elena Brooks", familyHistory: "Hypertension" },
      { firstName: "Marcus", lastName: "Nguyen", dateOfBirth: "1975-09-02", gender: "Male", phone: "+1 206 555 1102", bloodType: "A+", allergies: "None known", primaryCareProvider: "Dr. Elena Brooks", familyHistory: "Type 2 diabetes" },
      { firstName: "Sofia", lastName: "Ramirez", dateOfBirth: "1996-01-25", gender: "Female", phone: "+1 206 555 1103", bloodType: "B+", allergies: "Latex", primaryCareProvider: "Dr. Elena Brooks", familyHistory: "Asthma" },
      { firstName: "Henry", lastName: "Thompson", dateOfBirth: "1968-12-11", gender: "Male", phone: "+1 206 555 1104", bloodType: "AB+", allergies: "None known", primaryCareProvider: "Dr. Elena Brooks", familyHistory: "Heart disease" },
    ],
  },
  {
    name: "Northstar Wellness & Pediatrics",
    slug: "demo-northstar-wellness-pediatrics",
    emailDomain: "northstar.demo.openhealthcrm.test",
    city: "Denver",
    country: "United States",
    timezone: "America/Denver",
    currency: "USD",
    phone: "+1 303 555 0196",
    address: "8800 Northstar Parkway, Denver, CO",
    doctorName: "Amelia Chen",
    coordinatorName: "Taylor Brooks",
    nurseName: "Samira Khan",
    billerName: "Ethan Miller",
    pharmacistName: "Luis Garcia",
    specialty: "Pediatrics",
    patients: [
      { firstName: "Liam", lastName: "Foster", dateOfBirth: "2016-03-09", gender: "Male", phone: "+1 303 555 2101", bloodType: "O+", allergies: "Eggs", primaryCareProvider: "Dr. Amelia Chen", familyHistory: "Eczema" },
      { firstName: "Emma", lastName: "Wilson", dateOfBirth: "2013-07-21", gender: "Female", phone: "+1 303 555 2102", bloodType: "A+", allergies: "None known", primaryCareProvider: "Dr. Amelia Chen", familyHistory: "Asthma" },
      { firstName: "Mateo", lastName: "Rivera", dateOfBirth: "1989-11-14", gender: "Male", phone: "+1 303 555 2103", bloodType: "B-", allergies: "Ibuprofen", primaryCareProvider: "Dr. Amelia Chen", familyHistory: "Migraine" },
      { firstName: "Grace", lastName: "Kim", dateOfBirth: "1992-05-30", gender: "Female", phone: "+1 303 555 2104", bloodType: "AB+", allergies: "None known", primaryCareProvider: "Dr. Amelia Chen", familyHistory: "Thyroid disease" },
    ],
  },
];

async function main() {
  console.log("Seeding additive demo tenants (existing rows are preserved)...");
  for (const clinic of clinics) {
    const result = await seedClinic(clinic);
    console.log(`${result.name}: ${result.accounts.length} staff accounts ready (${result.orgId})`);
  }
  console.log(`Demo password for all staff: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
