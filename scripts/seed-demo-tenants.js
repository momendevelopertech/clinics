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
const DEMO_PATIENT_PASSWORD = "PatientDemo!2026";

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
  const isPortalDemoPatient = index === 1;
  const patientEmail = isPortalDemoPatient
    ? `patient@${clinic.emailDomain}`
    : `${clinic.slug}.patient${index}@example.test`;
  return prisma.patient.upsert({
    where: { organizationId_mrn: { organizationId: orgId, mrn: `DM-${clinic.slug}-${String(index).padStart(3, "0")}` } },
    update: {
      organizationId: orgId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      email: patientEmail,
      phone: data.phone,
      city: clinic.city,
      country: clinic.country,
      bloodType: data.bloodType,
      allergies: data.allergies,
      primaryCareProvider: data.primaryCareProvider,
      familyHistory: data.familyHistory,
      ...(isPortalDemoPatient ? { passwordHash: data.passwordHash } : {}),
      status: "Active",
    },
    create: {
      organizationId: orgId,
      mrn: `DM-${clinic.slug}-${String(index).padStart(3, "0")}`,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      email: patientEmail,
      phone: data.phone,
      city: clinic.city,
      country: clinic.country,
      bloodType: data.bloodType,
      allergies: data.allergies,
      primaryCareProvider: data.primaryCareProvider,
      familyHistory: data.familyHistory,
      passwordHash: data.passwordHash ?? null,
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
    { organizationId: org.id, name: `${clinic.name} — الفرع الرئيسي` },
    {
      organizationId: org.id,
      name: `${clinic.name} — الفرع الرئيسي`,
      address: clinic.address,
      city: clinic.city,
      country: clinic.country,
      phone: clinic.phone,
      status: "active",
      workingHours: JSON.stringify({ sun: { open: "08:00", close: "20:00" }, mon: { open: "08:00", close: "20:00" }, tue: { open: "08:00", close: "20:00" }, wed: { open: "08:00", close: "20:00" }, thu: { open: "08:00", close: "18:00" } }),
    },
  );
  const room = await findOrCreate(
    "room",
    { organizationId: org.id, name: "غرفة الكشف ١" },
    { organizationId: org.id, branchId: branch.id, name: "غرفة الكشف ١", number: "101", type: "consultation", status: "active" },
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
    ["owner", "Owner", "owner", "عادل مصطفى"],
    ["doctor", "Doctor", "doctor", clinic.doctorName],
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
    patients.push(await ensurePatient(org.id, clinic, index, {
      ...clinic.patients[index - 1],
      passwordHash: hashPassword(DEMO_PATIENT_PASSWORD),
    }));
  }

  const services = {};
  for (const service of [
    ["CONSULT", "استشارة شاملة", "consultation", "300.00"],
    ["FOLLOWUP", "زيارة متابعة", "consultation", "200.00"],
    ["LAB-CBC", "صورة دم كاملة", "laboratory", "150.00"],
  ]) {
    services[service[0]] = await prisma.serviceCatalog.upsert({
      where: { organizationId_code: { organizationId: org.id, code: service[0] } },
      update: { name: service[1], category: service[2], price: service[3], active: true },
      create: { organizationId: org.id, code: service[0], name: service[1], category: service[2], price: service[3], active: true },
    });
  }
  await prisma.clinicalCatalog.upsert({
    where: { organizationId_system_code: { organizationId: org.id, system: "ICD-10", code: "I10" } },
    update: { name: "ارتفاع ضغط الدم الأساسي", category: "diagnosis", active: true },
    create: { organizationId: org.id, system: "ICD-10", code: "I10", name: "ارتفاع ضغط الدم الأساسي", category: "diagnosis", active: true },
  });

  const pastAppointment = await prisma.appointment.upsert({
    where: { idempotencyKey: `demo:${clinic.slug}:appointment:past` },
    update: { status: "completed", notes: "زيارة تجريبية مكتملة", providerId: users.doctor.id, patientId: patients[0].id, branchId: branch.id, roomId: room.id },
    create: { organizationId: org.id, patientId: patients[0].id, providerId: users.doctor.id, branchId: branch.id, roomId: room.id, startTime: dateFromNow(-14, 10), endTime: dateFromNow(-14, 10.5), appointmentType: "consultation", status: "completed", notes: "زيارة تجريبية مكتملة", idempotencyKey: `demo:${clinic.slug}:appointment:past` },
  });
  await prisma.appointment.upsert({
    where: { idempotencyKey: `demo:${clinic.slug}:appointment:upcoming` },
    update: { status: "scheduled", providerId: users.doctor.id, patientId: patients[1].id, branchId: branch.id, roomId: room.id },
    create: { organizationId: org.id, patientId: patients[1].id, providerId: users.doctor.id, branchId: branch.id, roomId: room.id, startTime: dateFromNow(7, 14), endTime: dateFromNow(7, 14.5), appointmentType: "follow-up", status: "scheduled", notes: "مراجعة خطة الرعاية ونتائج المختبر", idempotencyKey: `demo:${clinic.slug}:appointment:upcoming` },
  });

  const encounter = await findOrCreate(
    "encounter",
    { organizationId: org.id, appointmentId: pastAppointment.id },
    { organizationId: org.id, patientId: patients[0].id, appointmentId: pastAppointment.id, startTime: dateFromNow(-14, 10), endTime: dateFromNow(-14, 10.5), status: "completed", encounterType: "office_visit" },
  );
  await findOrCreate("encounterNote", { encounterId: encounter.id, text: `Demo note:${clinic.slug}:past` }, {
    encounterId: encounter.id, authorId: users.doctor.id, noteType: "SOAP",
    subjective: "تشكو المريضة من صداع متقطع منذ أسبوعين.",
    objective: "ضغط الدم 138/88، النبض 76، لا توجد علامات خطر.",
    assessment: "صداع مرجّح مرتبط بالتوتر؛ مراقبة ضغط الدم.",
    plan: "ترطيب الجسم ونوم منتظم ومتابعة بعد أسبوعين.",
    text: `Demo note:${clinic.slug}:past`,
  });
  await findOrCreate("vital", { patientId: patients[0].id, encounterId: encounter.id }, {
    patientId: patients[0].id, encounterId: encounter.id, weightKg: 72, heightCm: 174, bloodPressureSystolic: 138, bloodPressureDiastolic: 88, heartRate: 76, bmi: 23.8, spO2: 98, temperature: 36.7,
  });
  await findOrCreate("diagnosis", { organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, code: "I10" }, {
    organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, system: "ICD-10", code: "I10", name: "ارتفاع ضغط الدم الأساسي", notes: "تشخيص تجريبي", status: "active",
  });

  const labOrder = await findOrCreate("labOrder", { organizationId: org.id, patientId: patients[0].id, testName: "صورة دم كاملة", indication: `Demo:${clinic.slug}:cbc` }, {
    organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, orderedById: users.doctor.id, orderType: "lab", testName: "صورة دم كاملة", priority: "routine", indication: `Demo:${clinic.slug}:cbc`, status: "resulted",
  });
  await findOrCreate("labResult", { organizationId: org.id, orderId: labOrder.id, testName: "الهيموجلوبين" }, {
    organizationId: org.id, patientId: patients[0].id, orderId: labOrder.id, testName: "الهيموجلوبين", resultValue: "13.8", unit: "g/dL", referenceRange: "12.0-16.0", status: "completed", performedAt: dateFromNow(-12), reviewedById: users.doctor.id, reviewedAt: dateFromNow(-11), reviewNote: "تمت مراجعة النتيجة.",
  });
  const prescription = await prisma.prescription.upsert({
    where: { idempotencyKey: `demo:${clinic.slug}:prescription:1` },
    update: { patientId: patients[0].id, encounterId: encounter.id, prescribedById: users.doctor.id, status: "active" },
    create: { organizationId: org.id, patientId: patients[0].id, encounterId: encounter.id, prescribedById: users.doctor.id, medicationName: "Amlodipine 5 mg", dosage: "5 mg", frequency: "مرة يومياً", duration: "30 days", instructions: "يؤخذ بعد الإفطار.", status: "active", idempotencyKey: `demo:${clinic.slug}:prescription:1` },
  });
  await findOrCreate("prescriptionItem", { prescriptionId: prescription.id, medicationName: "Amlodipine 5 mg" }, {
    prescriptionId: prescription.id, medicationName: "Amlodipine 5 mg", dosage: "5 mg", frequency: "مرة يومياً", duration: "30 days", instructions: "يؤخذ بعد الإفطار.",
  });

  for (const [index, patient] of patients.slice(0, 2).entries()) {
    const invoiceNumber = `DM-${clinic.slug.toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
    const totalAmount = index === 0 ? "300.00" : "500.00";
    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber },
      update: { patientId: patient.id, status: index === 0 ? "paid" : "overdue", totalAmount, amountPaid: index === 0 ? "300.00" : "0.00", dueDate: dateFromNow(index === 0 ? -7 : -2) },
      create: { organizationId: org.id, patientId: patient.id, invoiceNumber, currency: clinic.currency, status: index === 0 ? "paid" : "overdue", totalAmount, amountPaid: index === 0 ? "300.00" : "0.00", dueDate: dateFromNow(index === 0 ? -7 : -2), idempotencyKey: `demo:${clinic.slug}:invoice:${index + 1}` },
    });
    await findOrCreate("invoiceLineItem", { invoiceId: invoice.id, description: `استشارة تجريبية:${clinic.slug}:${index + 1}` }, {
      invoiceId: invoice.id, serviceCatalogId: services.CONSULT.id, description: `استشارة تجريبية:${clinic.slug}:${index + 1}`, quantity: 1, unitPrice: "300.00", amount: "300.00", encounterId: index === 0 ? encounter.id : null,
    });
    if (index === 1) {
      await findOrCreate("invoiceLineItem", { invoiceId: invoice.id, description: `متابعة تجريبية:${clinic.slug}:${index + 1}` }, {
        invoiceId: invoice.id, serviceCatalogId: services.FOLLOWUP.id, description: `متابعة تجريبية:${clinic.slug}:${index + 1}`, quantity: 1, unitPrice: "200.00", amount: "200.00", encounterId: null,
      });
    }
    if (index === 0) {
      await findOrCreate("payment", { invoiceId: invoice.id, amount: "300.00", status: "completed" }, { invoiceId: invoice.id, amount: "300.00", paymentMethod: "card", status: "completed" });
    }
  }

  for (const item of [
    ["Amlodipine 5 mg", "MED-AML-5", "medication", 84, 20, "علبة"],
    ["قفازات طبية للاستخدام الواحد", "SUP-GLOVE-M", "consumable", 240, 50, "علبة"],
  ]) {
    const inventory = await findOrCreate("inventoryItem", { organizationId: org.id, sku: item[1] }, {
      organizationId: org.id, name: item[0], sku: item[1], category: item[2], quantity: item[3], reorderLevel: item[4], unit: item[5],
    });
    await findOrCreate("inventoryTransaction", { itemId: inventory.id, reason: `إعادة توريد تجريبية:${clinic.slug}` }, { itemId: inventory.id, type: "restock", quantity: item[3], reason: `إعادة توريد تجريبية:${clinic.slug}` });
  }

  await findOrCreate("task", { organizationId: org.id, title: `مراجعة مختبر تجريبية:${clinic.slug}` }, {
    organizationId: org.id, title: `مراجعة مختبر تجريبية:${clinic.slug}`, description: "مراجعة صورة الدم المكتملة وتأكيد متابعة المريض.", status: "open", priority: "high", dueDate: dateFromNow(2), patientId: patients[0].id, assigneeId: users.nurse.id, creatorId: users.doctor.id, taskType: "lab_review",
  });
  await findOrCreate("waitlistEntry", { organizationId: org.id, patientId: patients[2].id, notes: `قائمة انتظار تجريبية:${clinic.slug}` }, {
    organizationId: org.id, patientId: patients[2].id, preferredDate: dateFromNow(10), notes: `قائمة انتظار تجريبية:${clinic.slug}`, status: "waiting",
  });
  await findOrCreate("consent", { patientId: patients[0].id, consentType: "treatment" }, {
    patientId: patients[0].id, organizationId: org.id, consentType: "treatment", isGranted: true, signedAt: dateFromNow(-14),
  });
  await findOrCreate("document", { organizationId: org.id, name: `تقرير صورة دم تجريبي:${clinic.slug}` }, {
    organizationId: org.id, patientId: patients[0].id, name: `تقرير صورة دم تجريبي:${clinic.slug}`, type: "lab_report", storageKey: `demo/${clinic.slug}/cbc-report.pdf`, mimeType: "application/pdf",
  });
  await findOrCreate("communication", { organizationId: org.id, patientId: patients[1].id, content: `تذكير تجريبي:${clinic.slug}` }, {
    organizationId: org.id, patientId: patients[1].id, channel: "email", type: "reminder", status: "sent", content: `تذكير تجريبي:${clinic.slug}`, scheduledFor: dateFromNow(5), sentAt: dateFromNow(-1),
  });
  await findOrCreate("campaign", { organizationId: org.id, name: `حملة رعاية مزمنة تجريبية:${clinic.slug}` }, {
    organizationId: org.id, name: `حملة رعاية مزمنة تجريبية:${clinic.slug}`, type: "broadcast", status: "draft", triggerType: "chronic_care",
  });

  return {
    name: clinic.name,
    orgId: org.id,
    accounts: accountDefinitions.map(([key, roleName]) => ({ role: roleName, email: `${key}@${clinic.emailDomain}` })),
    patientAccount: { email: `patient@${clinic.emailDomain}`, mrn: `DM-${clinic.slug}-001` },
  };
}

const clinics = [
  {
    name: "عيادة الأسرة بالإسكندرية",
    slug: "demo-alexandria-family-clinic",
    emailDomain: "alexandria.demo.openhealthcrm.test",
    city: "الإسكندرية",
    country: "Egypt",
    timezone: "Africa/Cairo",
    currency: "EGP",
    phone: "+20 100 000 1001",
    address: "١٨ شارع رشدي، سيدي جابر، الإسكندرية، مصر",
    doctorName: "يوسف السيد",
    coordinatorName: "منى حسن",
    nurseName: "سلمى محمود",
    billerName: "عمر عبد الرحمن",
    pharmacistName: "هاني فاضل",
    specialty: "طب الأسرة",
    patients: [
      { firstName: "أحمد", lastName: "محمود", dateOfBirth: "1987-04-18", gender: "ذكر", phone: "+20 100 111 0001", bloodType: "O+", allergies: "بنسلين", primaryCareProvider: "د. يوسف السيد", familyHistory: "ارتفاع ضغط الدم" },
      { firstName: "مريم", lastName: "خالد", dateOfBirth: "1975-09-02", gender: "أنثى", phone: "+20 100 111 0002", bloodType: "A+", allergies: "لا توجد", primaryCareProvider: "د. يوسف السيد", familyHistory: "سكري النوع الثاني" },
      { firstName: "ياسمين", lastName: "السيد", dateOfBirth: "1996-01-25", gender: "أنثى", phone: "+20 100 111 0003", bloodType: "B+", allergies: "لاتكس", primaryCareProvider: "د. يوسف السيد", familyHistory: "ربو" },
      { firstName: "هشام", lastName: "طارق", dateOfBirth: "1968-12-11", gender: "ذكر", phone: "+20 100 111 0004", bloodType: "AB+", allergies: "لا توجد", primaryCareProvider: "د. يوسف السيد", familyHistory: "أمراض القلب" },
    ],
  },
  {
    name: "مركز سموحة لطب الأطفال",
    slug: "demo-smouha-pediatrics-center",
    emailDomain: "smouha.demo.openhealthcrm.test",
    city: "الإسكندرية",
    country: "Egypt",
    timezone: "Africa/Cairo",
    currency: "EGP",
    phone: "+20 100 000 2002",
    address: "٤٢ شارع سموحة، سموحة، الإسكندرية، مصر",
    doctorName: "منى ياسين",
    coordinatorName: "تامر بخيت",
    nurseName: "سمر خليل",
    billerName: "كريم منصور",
    pharmacistName: "محمود سعيد",
    specialty: "طب الأطفال",
    patients: [
      { firstName: "عمر", lastName: "فؤاد", dateOfBirth: "2016-03-09", gender: "ذكر", phone: "+20 100 222 0001", bloodType: "O+", allergies: "بيض", primaryCareProvider: "د. منى ياسين", familyHistory: "إكزيما" },
      { firstName: "لينا", lastName: "سمير", dateOfBirth: "2013-07-21", gender: "أنثى", phone: "+20 100 222 0002", bloodType: "A+", allergies: "لا توجد", primaryCareProvider: "د. منى ياسين", familyHistory: "ربو" },
      { firstName: "يوسف", lastName: "رامي", dateOfBirth: "1989-11-14", gender: "ذكر", phone: "+20 100 222 0003", bloodType: "B-", allergies: "إيبوبروفين", primaryCareProvider: "د. منى ياسين", familyHistory: "صداع نصفي" },
      { firstName: "نور", lastName: "المصري", dateOfBirth: "1992-05-30", gender: "أنثى", phone: "+20 100 222 0004", bloodType: "AB+", allergies: "لا توجد", primaryCareProvider: "د. منى ياسين", familyHistory: "أمراض الغدة الدرقية" },
    ],
  },
];

async function suspendStaleDemoOrgs() {
  const stale = await prisma.organization.findMany({
    where: {
      slug: { startsWith: "demo-", notIn: clinics.map((clinic) => clinic.slug) },
      status: "active",
    },
    select: { id: true, slug: true },
  });
  for (const org of stale) {
    await prisma.organization.update({ where: { id: org.id }, data: { status: "suspended" } });
  }
  if (stale.length > 0) {
    console.log(`Suspended ${stale.length} stale demo org(s): ${stale.map((org) => org.slug).join(", ")}`);
  }
}

async function main() {
  console.log("Seeding additive demo tenants (existing rows are preserved)...");
  await suspendStaleDemoOrgs();
  for (const clinic of clinics) {
    const result = await seedClinic(clinic);
    console.log(`${result.name}: ${result.accounts.length} staff accounts + 1 patient account ready (${result.orgId})`);
  }
  console.log(`Demo password for all staff: ${DEMO_PASSWORD}`);
  console.log(`Demo password for one patient in each clinic: ${DEMO_PATIENT_PASSWORD}`);
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
