/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

function daysFromNow(days, hour = 9, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function ensureRole(organizationId, name, permissions) {
  let role = await prisma.role.findFirst({
    where: { organizationId, name },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        organizationId,
        name,
      },
    });
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId: role.id },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: role.id,
      action: permission.action,
      resource: permission.resource,
    })),
  });

  return role;
}

async function ensureUserRole(userId, roleId) {
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId },
  });

  if (!existing) {
    await prisma.userRole.create({
      data: { userId, roleId },
    });
  }
}

async function ensurePatient(organizationId, data) {
  const patient = await prisma.patient.upsert({
    where: { mrn: data.mrn },
    update: {
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      phoneSecondary: data.phoneSecondary ?? null,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      bloodType: data.bloodType,
      allergies: data.allergies,
      primaryCareProvider: data.primaryCareProvider,
      familyHistory: data.familyHistory ?? null,
      passwordHash: data.passwordHash,
      status: data.status,
    },
    create: {
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      mrn: data.mrn,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      phoneSecondary: data.phoneSecondary ?? null,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      bloodType: data.bloodType,
      allergies: data.allergies,
      primaryCareProvider: data.primaryCareProvider,
      familyHistory: data.familyHistory ?? null,
      passwordHash: data.passwordHash,
      status: data.status,
    },
  });

  await prisma.emergencyContact.upsert({
    where: { patientId: patient.id },
    update: {
      name: data.emergencyContact.name,
      relationship: data.emergencyContact.relationship,
      phone: data.emergencyContact.phone,
      email: data.emergencyContact.email ?? null,
    },
    create: {
      patientId: patient.id,
      name: data.emergencyContact.name,
      relationship: data.emergencyContact.relationship,
      phone: data.emergencyContact.phone,
      email: data.emergencyContact.email ?? null,
    },
  });

  return patient;
}

// Delete all transactional/operational records for the org so the seed stays
// idempotent (delete children before parents). Master/reference data
// (roles, service/clinical catalogs, pricing tiers) is upserted instead.
async function clearOperationalData({
  orgId,
  patientIds,
  appointmentIds,
  encounterIds,
  invoiceIds,
  inventoryItemIds,
  prescriptionIds,
}) {
  await prisma.appointmentEquipment.deleteMany({
    where: { appointmentId: { in: appointmentIds } },
  });
  await prisma.encounterNote.deleteMany({
    where: { encounterId: { in: encounterIds } },
  });
  await prisma.patientSession.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.payment.deleteMany({
    where: { invoiceId: { in: invoiceIds } },
  });
  await prisma.invoiceLineItem.deleteMany({
    where: { invoiceId: { in: invoiceIds } },
  });
  await prisma.inventoryTransaction.deleteMany({
    where: { itemId: { in: inventoryItemIds } },
  });
  await prisma.prescriptionItem.deleteMany({
    where: { prescriptionId: { in: prescriptionIds } },
  });
  await prisma.prescription.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.labResult.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.labOrder.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.procedureOrder.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.document.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.followUp.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.diagnosis.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.patientHistory.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.insuranceClaim.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.feedbackSurvey.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.communication.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.campaign.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.task.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.waitlistEntry.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.consent.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.vital.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.insurancePolicy.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.notification.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.encounter.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.appointment.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.inventoryItem.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.invoice.deleteMany({
    where: { organizationId: orgId },
  });
}

async function main() {
  console.log("Starting seed...");

  const adminPasswordHash = hashPassword("admin123");
  const patientPasswordHash = hashPassword("patient123");

  // ---- Platform admin org (kept as-is) ----
  const superOrg = await prisma.organization.upsert({
    where: { slug: "platform-admin" },
    update: {
      name: "إدارة المنصة",
      status: "active",
      plan: "plus",
      onboardingSource: "manual",
      settingsJson: JSON.stringify({ appointmentDurationMins: 30 }),
    },
    create: {
      name: "إدارة المنصة",
      slug: "platform-admin",
      status: "active",
      plan: "plus",
      onboardingSource: "manual",
      settingsJson: JSON.stringify({ appointmentDurationMins: 30 }),
      timezone: "UTC",
      currency: "USD",
    },
  });

  const superAdminRole = await ensureRole(superOrg.id, "Super Admin", [
    { action: "patients:read", resource: "patients" },
    { action: "patients:write", resource: "patients" },
    { action: "appointments:read", resource: "appointments" },
    { action: "appointments:write", resource: "appointments" },
    { action: "encounters:read", resource: "encounters" },
    { action: "encounters:write", resource: "encounters" },
    { action: "inventory:read", resource: "inventory" },
    { action: "inventory:write", resource: "inventory" },
    { action: "billing:read", resource: "billing" },
    { action: "billing:write", resource: "billing" },
  ]);

  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@acmeclinic.com" },
    update: {
      organizationId: superOrg.id,
      name: "مدير المنصة",
      role: "superAdmin",
      active: true,
      emailVerified: true,
    },
    create: {
      organizationId: superOrg.id,
      email: "superadmin@acmeclinic.com",
      name: "مدير المنصة",
      role: "superAdmin",
      active: true,
      emailVerified: true,
      passwordHash: adminPasswordHash,
    },
  });
  await ensureUserRole(superAdminUser.id, superAdminRole.id);

  // ---- Main clinic: Alexandria, Egypt ----
  let organization = await prisma.organization.findFirst({
    where: { name: "مركز الإسكندرية الطبي" },
  });
  if (!organization) {
    organization = await prisma.organization.findFirst({
      where: { slug: "acme-clinic" },
    });
  }
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: "مركز الإسكندرية الطبي",
        slug: "alexandria-medical-center",
        phone: "+20 3 487 5500",
        address: "شارع أبو قير، سموحة",
        city: "الإسكندرية",
        country: "Egypt",
        timezone: "Africa/Cairo",
        currency: "EGP",
        status: "active",
        plan: "clinic",
        onboardingSource: "manual",
        settingsJson: JSON.stringify({
          appointmentDurationMins: 20,
          openTime: "10:00",
          closeTime: "22:00",
        }),
      },
    });
  } else {
    organization = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: "مركز الإسكندرية الطبي",
        slug: "alexandria-medical-center",
        phone: "+20 3 487 5500",
        address: "شارع أبو قير، سموحة",
        city: "الإسكندرية",
        country: "Egypt",
        timezone: "Africa/Cairo",
        currency: "EGP",
        status: "active",
        plan: "clinic",
        onboardingSource: "manual",
        settingsJson: JSON.stringify({
          appointmentDurationMins: 20,
          openTime: "10:00",
          closeTime: "22:00",
        }),
      },
    });
  }

  console.log("Organization:", organization.id);

  const branchData = [
    {
      name: "فرع سموحة الرئيسي",
      address: "شارع أبو قير، الدور الثالث",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21516",
      country: "Egypt",
      phone: "+20 3 487 5500",
      workingHours: JSON.stringify({
        sat: { open: "10:00", close: "22:00" },
        sun: { open: "10:00", close: "22:00" },
        mon: { open: "10:00", close: "22:00" },
        tue: { open: "10:00", close: "22:00" },
        wed: { open: "10:00", close: "22:00" },
        thu: { open: "10:00", close: "20:00" },
      }),
    },
    {
      name: "فرع سيدي جابر",
      address: "شارع سموحة، سيدي جابر",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21311",
      country: "Egypt",
      phone: "+20 3 543 2210",
      workingHours: JSON.stringify({
        sat: { open: "13:00", close: "21:00" },
        sun: { open: "13:00", close: "21:00" },
        mon: { open: "13:00", close: "21:00" },
        tue: { open: "13:00", close: "21:00" },
        wed: { open: "13:00", close: "21:00" },
        thu: { open: "13:00", close: "21:00" },
      }),
    },
    {
      name: "فرع محطة الرمل",
      address: "شارع سعد زغلول، محطة الرمل",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21511",
      country: "Egypt",
      phone: "+20 3 486 7755",
      workingHours: JSON.stringify({
        sat: { open: "09:00", close: "17:00" },
        sun: { open: "09:00", close: "17:00" },
        mon: { open: "09:00", close: "17:00" },
        tue: { open: "09:00", close: "17:00" },
        wed: { open: "09:00", close: "17:00" },
        thu: { open: "09:00", close: "17:00" },
      }),
    },
  ];

  const branches = [];
  for (const branch of branchData) {
    let branchRecord = await prisma.branch.findFirst({
      where: { organizationId: organization.id, name: branch.name },
    });
    if (!branchRecord) {
      branchRecord = await prisma.branch.create({
        data: { organizationId: organization.id, ...branch, status: "active" },
      });
    } else {
      branchRecord = await prisma.branch.update({
        where: { id: branchRecord.id },
        data: { ...branch, status: "active" },
      });
    }
    branches.push(branchRecord);
  }
  const mainBranch = branches[0];

  const allPermissions = [
    { action: "patients:read", resource: "patients" },
    { action: "patients:write", resource: "patients" },
    { action: "appointments:read", resource: "appointments" },
    { action: "appointments:write", resource: "appointments" },
    { action: "encounters:read", resource: "encounters" },
    { action: "encounters:write", resource: "encounters" },
    { action: "inventory:read", resource: "inventory" },
    { action: "inventory:write", resource: "inventory" },
    { action: "billing:read", resource: "billing" },
    { action: "billing:write", resource: "billing" },
    { action: "lab:read", resource: "lab" },
    { action: "lab:write", resource: "lab" },
    { action: "pharmacy:read", resource: "pharmacy" },
    { action: "pharmacy:write", resource: "pharmacy" },
  ];

  const doctorRole = await ensureRole(organization.id, "Doctor", allPermissions);
  const coordinatorRole = await ensureRole(organization.id, "Care Coordinator", allPermissions);
  const billerRole = await ensureRole(organization.id, "Biller", [
    { action: "patients:read", resource: "patients" },
    { action: "appointments:read", resource: "appointments" },
    { action: "billing:read", resource: "billing" },
    { action: "billing:write", resource: "billing" },
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@acmeclinic.com" },
    update: {
      organizationId: organization.id,
      name: "د. أحمد عبد الرحمن",
      passwordHash: adminPasswordHash,
      role: "doctor",
      specialty: "طب باطني",
      licenseNumber: "L-EG-ALX-10233",
      consultationFee: "300",
      availabilityType: "regular",
      availableDays: JSON.stringify(["sat", "sun", "mon", "tue", "wed"]),
      availableFrom: "10:00",
      availableTo: "22:00",
      branchId: mainBranch.id,
      workingHours: JSON.stringify({
        mon: { open: "10:00", close: "22:00" },
        tue: { open: "10:00", close: "22:00" },
        wed: { open: "10:00", close: "22:00" },
        sat: { open: "10:00", close: "22:00" },
        sun: { open: "10:00", close: "22:00" },
      }),
    },
    create: {
      organizationId: organization.id,
      email: "admin@acmeclinic.com",
      name: "د. أحمد عبد الرحمن",
      passwordHash: adminPasswordHash,
      role: "doctor",
      specialty: "طب باطني",
      licenseNumber: "L-EG-ALX-10233",
      consultationFee: "300",
      availabilityType: "regular",
      availableDays: JSON.stringify(["sat", "sun", "mon", "tue", "wed"]),
      availableFrom: "10:00",
      availableTo: "22:00",
      branchId: mainBranch.id,
      workingHours: JSON.stringify({
        mon: { open: "10:00", close: "22:00" },
        tue: { open: "10:00", close: "22:00" },
        wed: { open: "10:00", close: "22:00" },
        sat: { open: "10:00", close: "22:00" },
        sun: { open: "10:00", close: "22:00" },
      }),
    },
  });

  const coordinatorUser = await prisma.user.upsert({
    where: { email: "ops@acmeclinic.com" },
    update: {
      organizationId: organization.id,
      name: "سارة محمود",
      passwordHash: adminPasswordHash,
      role: "receptionist",
      branchId: mainBranch.id,
    },
    create: {
      organizationId: organization.id,
      email: "ops@acmeclinic.com",
      name: "سارة محمود",
      passwordHash: adminPasswordHash,
      role: "receptionist",
      branchId: mainBranch.id,
    },
  });

  const billingUser = await prisma.user.upsert({
    where: { email: "billing@acmeclinic.com" },
    update: {
      organizationId: organization.id,
      name: "محمد الشناوي",
      passwordHash: adminPasswordHash,
      role: "biller",
      branchId: mainBranch.id,
    },
    create: {
      organizationId: organization.id,
      email: "billing@acmeclinic.com",
      name: "محمد الشناوي",
      passwordHash: adminPasswordHash,
      role: "biller",
      branchId: mainBranch.id,
    },
  });

  await ensureUserRole(adminUser.id, doctorRole.id);
  await ensureUserRole(coordinatorUser.id, coordinatorRole.id);
  await ensureUserRole(billingUser.id, billerRole.id);

  const roomData = [
    { name: "غرفة كشف 1", number: "101", type: "consultation" },
    { name: "غرفة كشف 2", number: "102", type: "consultation" },
    { name: "غرفة الإجراءات", number: "201", type: "procedure" },
    { name: "غرفة الموجات فوق الصوتية", number: "202", type: "imaging" },
  ];

  const roomRecords = [];
  for (const room of roomData) {
    let roomRecord = await prisma.room.findFirst({
      where: { organizationId: organization.id, name: room.name },
    });
    if (!roomRecord) {
      roomRecord = await prisma.room.create({
        data: {
          organizationId: organization.id,
          branchId: mainBranch.id,
          name: room.name,
          number: room.number,
          type: room.type,
          status: "active",
        },
      });
    } else {
      roomRecord = await prisma.room.update({
        where: { id: roomRecord.id },
        data: { number: room.number, type: room.type, branchId: mainBranch.id, status: "active" },
      });
    }
    roomRecords.push(roomRecord);
  }

  const equipmentData = [
    { name: "جهاز أشعة إكس راي رقمي", type: "xray" },
    { name: "جهاز موجات فوق صوتية", type: "ultrasound" },
    { name: "جهاز رسم قلب ECG", type: "diagnostic" },
    { name: "جهاز هولتر", type: "diagnostic" },
  ];

  const equipmentRecords = [];
  for (const equipment of equipmentData) {
    let equipmentRecord = await prisma.equipment.findFirst({
      where: { organizationId: organization.id, name: equipment.name },
    });
    if (!equipmentRecord) {
      equipmentRecord = await prisma.equipment.create({
        data: { organizationId: organization.id, name: equipment.name, type: equipment.type },
      });
    } else {
      equipmentRecord = await prisma.equipment.update({
        where: { id: equipmentRecord.id },
        data: { type: equipment.type },
      });
    }
    equipmentRecords.push(equipmentRecord);
  }

  const patientDefinitions = [
    {
      firstName: "أحمد",
      lastName: "سيد مصطفى",
      mrn: "MRN-1001",
      dateOfBirth: new Date("1978-03-12"),
      gender: "ذكر",
      email: "ahmed.sayed@example.com",
      phone: "+20 100 234 5678",
      phoneSecondary: "+20 111 234 5678",
      address: "شارع أبو قير، عمارة النور",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21516",
      country: "Egypt",
      bloodType: "O+",
      allergies: "بنسلين",
      primaryCareProvider: "د. أحمد عبد الرحمن",
      familyHistory: "ارتفاع ضغط وسكري من الدرجة الثانية",
      status: "Active",
      emergencyContact: {
        name: "منى أحمد",
        relationship: "الزوجة",
        phone: "+20 122 111 2233",
        email: "mona.ahmed@example.com",
      },
    },
    {
      firstName: "فاطمة",
      lastName: "حسن عبد الله",
      mrn: "MRN-1002",
      dateOfBirth: new Date("1990-08-25"),
      gender: "أنثى",
      email: "fatma.hassan@example.com",
      phone: "+20 122 345 6789",
      phoneSecondary: "+20 100 345 6789",
      address: "شارع السلطان حسين، سيدي جابر",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21311",
      country: "Egypt",
      bloodType: "A-",
      allergies: "لا يوجد",
      primaryCareProvider: "د. أحمد عبد الرحمن",
      familyHistory: "ربو",
      status: "Active",
      emergencyContact: {
        name: "حسن عبد الله",
        relationship: "الأب",
        phone: "+20 111 456 7890",
        email: "hassan.abdullah@example.com",
      },
    },
    {
      firstName: "محمد",
      lastName: "كامل إبراهيم",
      mrn: "MRN-1003",
      dateOfBirth: new Date("1965-01-05"),
      gender: "ذكر",
      email: "mohamed.kamel@example.com",
      phone: "+20 100 567 8901",
      phoneSecondary: null,
      address: "شارع 45، المنتزه",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21533",
      country: "Egypt",
      bloodType: "B+",
      allergies: "الأسماك",
      primaryCareProvider: "د. أحمد عبد الرحمن",
      familyHistory: "سكري",
      status: "Active",
      emergencyContact: {
        name: "هالة كامل",
        relationship: "الابنة",
        phone: "+20 122 567 8901",
        email: "hala.kamel@example.com",
      },
    },
    {
      firstName: "مريم",
      lastName: "عادل فوزي",
      mrn: "MRN-1004",
      dateOfBirth: new Date("1985-11-30"),
      gender: "أنثى",
      email: "mariam.adel@example.com",
      phone: "+20 122 678 9012",
      phoneSecondary: null,
      address: "شارع سعد زغلول، محطة الرمل",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21511",
      country: "Egypt",
      bloodType: "AB+",
      allergies: "لاتكس",
      primaryCareProvider: "د. أحمد عبد الرحمن",
      familyHistory: "أمراض شرايين القلب",
      status: "Active",
      emergencyContact: {
        name: "عادل فوزي",
        relationship: "الأب",
        phone: "+20 100 678 9012",
        email: "adel.fawzy@example.com",
      },
    },
    {
      firstName: "خالد",
      lastName: "سامي الدسوقي",
      mrn: "MRN-1005",
      dateOfBirth: new Date("1972-07-19"),
      gender: "ذكر",
      email: "khaled.samy@example.com",
      phone: "+20 100 789 0123",
      phoneSecondary: "+20 111 789 0123",
      address: "شارع جليم، جليم",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21514",
      country: "Egypt",
      bloodType: "O-",
      allergies: "سلفا",
      primaryCareProvider: "د. أحمد عبد الرحمن",
      familyHistory: "سكري حمل",
      status: "Active",
      emergencyContact: {
        name: "دعاء خالد",
        relationship: "الزوجة",
        phone: "+20 122 789 0123",
        email: "doaa.khaled@example.com",
      },
    },
    {
      firstName: "علا",
      lastName: "ياسر حجازي",
      mrn: "MRN-1006",
      dateOfBirth: new Date("1994-04-02"),
      gender: "أنثى",
      email: "ola.yasser@example.com",
      phone: "+20 122 890 1234",
      phoneSecondary: null,
      address: "شارع ميامي، ميامي",
      city: "الإسكندرية",
      state: "الإسكندرية",
      zip: "21545",
      country: "Egypt",
      bloodType: "A+",
      allergies: "لا يوجد",
      primaryCareProvider: "د. أحمد عبد الرحمن",
      familyHistory: "لا يوجد",
      status: "Active",
      emergencyContact: {
        name: "ياسر حجازي",
        relationship: "الأب",
        phone: "+20 100 890 1234",
        email: "yasser.hegazy@example.com",
      },
    },
  ];

  const patients = [];
  for (const patientData of patientDefinitions) {
    patients.push(
      await ensurePatient(organization.id, {
        ...patientData,
        passwordHash: patientPasswordHash,
      }),
    );
  }

  const patientIds = patients.map((patient) => patient.id);

  // ---- Reference / master data (upsert keeps them idempotent) ----

  const serviceCatalogData = [
    { code: "VISIT-SP", name: "كشف استشاري", category: "استشارة", durationMins: 20, price: "300" },
    { code: "VISIT-EX", name: "كشف أخصائي", category: "استشارة", durationMins: 15, price: "200" },
    { code: "FUP", name: "متابعة", category: "استشارة", durationMins: 15, price: "150" },
    { code: "XRAY", name: "أشعة إكس راي", category: "أشعة", durationMins: 30, price: "350" },
    { code: "US", name: "موجات فوق صوتية", category: "أشعة", durationMins: 30, price: "500" },
    { code: "ECG", name: "رسم قلب", category: "تشخيص", durationMins: 15, price: "250" },
    { code: "CBC", name: "صورة دم كاملة", category: "تحاليل", durationMins: 0, price: "150" },
    { code: "HBA1C", name: "سكر تراكمي HbA1c", category: "تحاليل", durationMins: 0, price: "180" },
    { code: "LIPID", name: "دهون الدم", category: "تحاليل", durationMins: 0, price: "220" },
    { code: "VITD", name: "فيتامين د", category: "تحاليل", durationMins: 0, price: "400" },
    { code: "PROC-DRESS", name: "تضميد جرح", category: "إجراءات", durationMins: 20, price: "100" },
    { code: "PROC-INJ", name: "حقنة عضل", category: "إجراءات", durationMins: 10, price: "50" },
  ];

  const serviceCatalogByCode = {};
  for (const s of serviceCatalogData) {
    const rec = await prisma.serviceCatalog.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: s.code } },
      update: { ...s, active: true },
      create: { organizationId: organization.id, ...s, active: true },
    });
    serviceCatalogByCode[s.code] = rec;
  }

  const clinicalCatalogData = [
    { system: "ICD10", code: "E11.9", name: "سكري غير المعتمد على الأنسولين", category: "غدد صماء" },
    { system: "ICD10", code: "I10", name: "ارتفاع ضغط الدم الأساسي", category: "قلب وأوعية" },
    { system: "ICD10", code: "K29.7", name: "التهاب المعدة", category: "جهاز هضمي" },
    { system: "ICD10", code: "J06.9", name: "عدوى الجهاز التنفسي العلوي الحادة", category: "صدر" },
    { system: "ICD10", code: "M54.5", name: "ألم أسفل الظهر", category: "عظام ومفاصل" },
    { system: "ICD10", code: "R51", name: "صداع", category: "أعصاب" },
    { system: "ICD10", code: "J30.4", name: "التهاب الأنف التحسسي", category: "حساسية" },
  ];

  for (const c of clinicalCatalogData) {
    await prisma.clinicalCatalog.upsert({
      where: { organizationId_system_code: { organizationId: organization.id, system: c.system, code: c.code } },
      update: { ...c, active: true },
      create: { organizationId: organization.id, ...c, active: true },
    });
  }

  for (const tier of [
    { name: "الباقة العائلية", description: "اشتراك شهري لباقة أسرة حتى 5 أفراد" },
    { name: "الباقة الذهبية", description: "أولوية حجز وخصم 20% على الخدمات" },
    { name: "الباقة الفضية", description: "خصم 10% على الاستشارات فقط" },
  ]) {
    const tierId = `${organization.id}-${tier.name}`;
    await prisma.pricingTier.upsert({
      where: { id: tierId },
      update: { name: tier.name, description: tier.description },
      create: { id: tierId, organizationId: organization.id, name: tier.name, description: tier.description },
    });
  }

  // ---- Capture existing ids before clearing transactional data ----
  const existingAppointments = await prisma.appointment.findMany({
    where: { organizationId: organization.id },
    select: { id: true },
  });
  const existingEncounters = await prisma.encounter.findMany({
    where: { organizationId: organization.id },
    select: { id: true },
  });
  const existingInvoices = await prisma.invoice.findMany({
    where: { organizationId: organization.id },
    select: { id: true },
  });
  const existingInventoryItems = await prisma.inventoryItem.findMany({
    where: { organizationId: organization.id },
    select: { id: true },
  });
  const existingPrescriptions = await prisma.prescription.findMany({
    where: { organizationId: organization.id },
    select: { id: true },
  });

  await clearOperationalData({
    orgId: organization.id,
    patientIds,
    appointmentIds: existingAppointments.map((entry) => entry.id),
    encounterIds: existingEncounters.map((entry) => entry.id),
    invoiceIds: existingInvoices.map((entry) => entry.id),
    inventoryItemIds: existingInventoryItems.map((entry) => entry.id),
    prescriptionIds: existingPrescriptions.map((entry) => entry.id),
  });

  const patientByMrn = Object.fromEntries(
    patients.map((patient) => [patient.mrn, patient]),
  );

  // ---- Appointments ----
  const appointments = [];
  const appointmentSeedData = [
    {
      patientId: patientByMrn["MRN-1001"].id,
      providerId: adminUser.id,
      roomId: roomRecords[0].id,
      branchId: mainBranch.id,
      startTime: daysFromNow(0, 10, 0),
      endTime: daysFromNow(0, 10, 20),
      appointmentType: "متابعة ضغط الدم",
      status: "in_progress",
      notes: "مراجعة قياسات ضغط الدم المنزلية وتحديث الجرعة",
      tokenNumber: "A-12",
      reminder24hSent: true,
      reminder1hSent: true,
    },
    {
      patientId: patientByMrn["MRN-1002"].id,
      providerId: adminUser.id,
      roomId: roomRecords[1].id,
      branchId: branches[1].id,
      startTime: daysFromNow(1, 11, 30),
      endTime: daysFromNow(1, 11, 50),
      appointmentType: "كشف شامل سنوي",
      status: "scheduled",
      notes: "فحص سنوي وتحصينات",
      tokenNumber: "A-13",
      reminder24hSent: true,
      reminder1hSent: false,
    },
    {
      patientId: patientByMrn["MRN-1003"].id,
      providerId: adminUser.id,
      roomId: roomRecords[2].id,
      branchId: mainBranch.id,
      startTime: daysFromNow(-1, 13, 0),
      endTime: daysFromNow(-1, 13, 30),
      appointmentType: "مراجعة سكر الدم",
      status: "completed",
      notes: "مناقشة نتائج السكر التراكمي وضبط العلاج",
      tokenNumber: "A-09",
      reminder24hSent: true,
      reminder1hSent: true,
    },
    {
      patientId: patientByMrn["MRN-1004"].id,
      providerId: adminUser.id,
      roomId: roomRecords[3].id,
      branchId: branches[2].id,
      startTime: daysFromNow(2, 14, 15),
      endTime: daysFromNow(2, 14, 45),
      appointmentType: "متابعة قلب - موجات فوق صوتية",
      status: "scheduled",
      notes: "مراجعة نتائج القلب",
      tokenNumber: "A-14",
      reminder24hSent: false,
      reminder1hSent: false,
    },
    {
      patientId: patientByMrn["MRN-1005"].id,
      providerId: adminUser.id,
      roomId: roomRecords[1].id,
      branchId: mainBranch.id,
      startTime: daysFromNow(4, 16, 0),
      endTime: daysFromNow(4, 16, 30),
      appointmentType: "متابعة دورية",
      status: "scheduled",
      notes: "متابعة نتائج فيتامين د ونمط الحياة",
      tokenNumber: "A-15",
      reminder24hSent: false,
      reminder1hSent: false,
    },
    {
      patientId: patientByMrn["MRN-1006"].id,
      providerId: adminUser.id,
      roomId: roomRecords[0].id,
      branchId: mainBranch.id,
      startTime: daysFromNow(3, 12, 30),
      endTime: daysFromNow(3, 12, 50),
      appointmentType: "استشارة حساسية",
      status: "scheduled",
      notes: "تقييم أعراض الحساسية الموسمية",
      tokenNumber: "A-16",
      reminder24hSent: false,
      reminder1hSent: false,
    },
  ];

  for (const appointmentData of appointmentSeedData) {
    appointments.push(
      await prisma.appointment.create({
        data: {
          organizationId: organization.id,
          ...appointmentData,
        },
      }),
    );
  }

  await prisma.appointmentEquipment.createMany({
    data: [
      { appointmentId: appointments[0].id, equipmentId: equipmentRecords[2].id },
      { appointmentId: appointments[2].id, equipmentId: equipmentRecords[1].id },
    ],
  });

  // ---- Encounters + notes + vitals ----
  const encounters = [];
  for (const encounterData of [
    {
      appointmentId: appointments[2].id,
      patientId: patientByMrn["MRN-1003"].id,
      startTime: new Date(appointments[2].startTime),
      endTime: new Date(appointments[2].endTime),
      status: "completed",
      encounterType: "office_visit",
    },
    {
      appointmentId: appointments[0].id,
      patientId: patientByMrn["MRN-1001"].id,
      startTime: new Date(appointments[0].startTime),
      endTime: null,
      status: "in_progress",
      encounterType: "office_visit",
    },
  ]) {
    encounters.push(
      await prisma.encounter.create({
        data: {
          organizationId: organization.id,
          ...encounterData,
        },
      }),
    );
  }

  await prisma.encounterNote.createMany({
    data: [
      {
        encounterId: encounters[0].id,
        authorId: adminUser.id,
        noteType: "SOAP",
        subjective: "المريض يشتكي من صداع متكرر وزيادة الوزن رغم تناول الدواء.",
        objective: "ارتفاع ضغط الدم، مؤشر كتلة الجسم 29.4، تحسن مستويات السكر.",
        assessment: "سكري مستقر مع تحسن في الالتزام بالعلاج.",
        plan: "استمرار الميتفورمين، إعادة السكر التراكمي بعد 12 أسبوع، متابعة غذائية.",
      },
      {
        encounterId: encounters[1].id,
        authorId: adminUser.id,
        noteType: "SOAP",
        subjective: "ضغط الدم المنزلي متغير في المساء حسب المريض.",
        objective: "ضغط مرتفع عند الدخول وتحسن بعد الراحة.",
        assessment: "ارتفاع ضغط الدم يحتاج تعديل توقيت الجرعة المسائية.",
        plan: "مراجعة توقيت الجرعة وطلب تحليل وظائف كلى قريب.",
      },
    ],
  });

  await prisma.vital.createMany({
    data: [
      {
        patientId: patientByMrn["MRN-1001"].id,
        encounterId: encounters[1].id,
        weightKg: 92.5,
        heightCm: 174,
        bloodPressureSystolic: 152,
        bloodPressureDiastolic: 94,
        heartRate: 82,
        bmi: 30.6,
        spO2: 97,
        temperature: 37.1,
      },
      {
        patientId: patientByMrn["MRN-1003"].id,
        encounterId: encounters[0].id,
        weightKg: 81.4,
        heightCm: 170,
        bloodPressureSystolic: 135,
        bloodPressureDiastolic: 85,
        heartRate: 76,
        bmi: 28.2,
        spO2: 98,
        temperature: 36.7,
      },
      {
        patientId: patientByMrn["MRN-1004"].id,
        weightKg: 70.2,
        heightCm: 160,
        bloodPressureSystolic: 128,
        bloodPressureDiastolic: 79,
        heartRate: 70,
        bmi: 27.4,
        spO2: 99,
        temperature: 36.5,
      },
    ],
  });

  // ---- Diagnoses ----
  await prisma.diagnosis.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        encounterId: encounters[1].id,
        system: "ICD10",
        code: "I10",
        name: "ارتفاع ضغط الدم الأساسي",
        status: "active",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1003"].id,
        encounterId: encounters[0].id,
        system: "ICD10",
        code: "E11.9",
        name: "سكري غير المعتمد على الأنسولين",
        status: "active",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1005"].id,
        system: "ICD10",
        code: "E55.9",
        name: "نقص فيتامين د",
        status: "active",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1006"].id,
        system: "ICD10",
        code: "J30.4",
        name: "التهاب الأنف التحسسي",
        status: "active",
      },
    ],
  });

  // ---- Patient histories ----
  await prisma.patientHistory.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        category: "chronical",
        title: "ارتفاع ضغط الدم",
        details: "يُشخَّص منذ 2018، على علاج مستمر بكونكور.",
        onsetDate: new Date("2018-06-01"),
        status: "active",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1003"].id,
        category: "chronical",
        title: "مرض السكري من النوع الثاني",
        details: "السكر التراكمي الأخير 6.9%، على جلوكوفاج 500mg مرتين يومياً.",
        onsetDate: new Date("2019-02-01"),
        status: "active",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1004"].id,
        category: "surgical",
        title: "عملية قسطرة قلب",
        details: "قُسطرت عام 2021 ووضع دعامة واحدة.",
        onsetDate: new Date("2021-10-10"),
        resolvedAt: new Date("2021-10-12"),
        status: "resolved",
      },
    ],
  });

  // ---- Follow ups ----
  await prisma.followUp.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        encounterId: encounters[1].id,
        dueDate: daysFromNow(14),
        reason: "متابعة ضغط الدم وتعديل الجرعة",
        instructions: "إحضار سجل قياسات الضغط المنزلية",
        status: "planned",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1003"].id,
        encounterId: encounters[0].id,
        dueDate: daysFromNow(30),
        reason: "إعادة فحص السكر التراكمي",
        instructions: "صيام قبل التحليل بـ 8 ساعات",
        status: "planned",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1005"].id,
        dueDate: daysFromNow(21),
        reason: "مراجعة جرعة فيتامين د بعد 6 أسابيع",
        instructions: "الالتزام بالمكملات الغذائية",
        status: "planned",
      },
    ],
  });

  // ---- Prescriptions + items ----
  const prescriptions = [];
  const prescriptionSeedData = [
    {
      patientId: patientByMrn["MRN-1001"].id,
      encounterId: encounters[1].id,
      medicationName: "كونكور Cor 5mg",
      dosage: "5 ملغ",
      frequency: "مرة يومياً صباحاً",
      duration: "90 يوم",
      instructions: "يؤخذ بعد الفطار مباشرة مع كوب ماء.",
      status: "active",
      sentToPharmacy: true,
      items: [
        { medicationName: "كونكور Cor 5mg", dosage: "5 ملغ", frequency: "مرة يومياً", duration: "90 يوم", instructions: "يؤخذ صباحاً" },
      ],
    },
    {
      patientId: patientByMrn["MRN-1003"].id,
      encounterId: encounters[0].id,
      medicationName: "جلوكوفاج XR 500mg",
      dosage: "500 ملغ",
      frequency: "مرتين يومياً",
      duration: "90 يوم",
      instructions: "يؤخذ مع الوجبات لتقليل اضطراب المعدة.",
      status: "active",
      sentToPharmacy: true,
      items: [
        { medicationName: "جلوكوفاج XR 500mg", dosage: "500 ملغ", frequency: "مرتين يومياً", duration: "90 يوم", instructions: "مع الوجبات" },
        { medicationName: "أتورفاستاتين 20mg", dosage: "20 ملغ", frequency: "مساءً", duration: "60 يوم", instructions: "قبل النوم" },
      ],
    },
    {
      patientId: patientByMrn["MRN-1005"].id,
      medicationName: "كبسولات فيتامين د 50000 وحدة",
      dosage: "50000 وحدة",
      frequency: "كبسولة أسبوعياً",
      duration: "8 أسابيع",
      instructions: "كبسولة واحدة كل أسبوع مع وجبة دسمة.",
      status: "active",
      sentToPharmacy: true,
      items: [
        { medicationName: "فيتامين د 50000 وحدة", dosage: "50000 وحدة", frequency: "أسبوعياً", duration: "8 أسابيع", instructions: "مع وجبة دسمة" },
      ],
    },
    {
      patientId: patientByMrn["MRN-1006"].id,
      medicationName: "زيرتك 10mg",
      dosage: "10 ملغ",
      frequency: "مرة يومياً",
      duration: "30 يوم",
      instructions: "يؤخذ مساءً قبل النوم لعلاج الحساسية.",
      status: "active",
      sentToPharmacy: true,
      items: [
        { medicationName: "زيرتك 10mg", dosage: "10 ملغ", frequency: "مرة يومياً", duration: "30 يوم", instructions: "مساءً" },
      ],
    },
  ];

  for (const p of prescriptionSeedData) {
    const prescription = await prisma.prescription.create({
      data: {
        organizationId: organization.id,
        patientId: p.patientId,
        encounterId: p.encounterId ?? null,
        prescribedById: adminUser.id,
        medicationName: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
        status: p.status,
        sentToPharmacy: p.sentToPharmacy,
      },
    });
    if (p.items.length) {
      await prisma.prescriptionItem.createMany({
        data: p.items.map((item) => ({ prescriptionId: prescription.id, ...item })),
      });
    }
    prescriptions.push(prescription);
  }

  // ---- Lab orders + results ----
  const labOrderSeedData = [
    {
      patientId: patientByMrn["MRN-1001"].id,
      orderType: "lab",
      testName: "وظائف كلى (Creatinine, Urea)",
      priority: "routine",
      indication: "متابعة وظائف الكلى أثناء علاج الضغط",
      status: "resulted",
      results: [
        {
          testName: "كرياتينين",
          resultValue: "0.9",
          unit: "mg/dL",
          referenceRange: "0.7 - 1.2",
          status: "completed",
          performedAt: daysFromNow(-3, 9, 0),
        },
        {
          testName: "يوريا",
          resultValue: "32",
          unit: "mg/dL",
          referenceRange: "15 - 40",
          status: "completed",
          performedAt: daysFromNow(-3, 9, 0),
        },
      ],
    },
    {
      patientId: patientByMrn["MRN-1003"].id,
      orderType: "lab",
      testName: "سكر تراكمي HbA1c",
      priority: "routine",
      indication: "متابعة ضبط السكر",
      status: "resulted",
      results: [
        {
          testName: "السكر التراكمي",
          resultValue: "6.9",
          unit: "%",
          referenceRange: "4.0 - 5.6",
          status: "abnormal",
          performedAt: daysFromNow(-4, 10, 30),
        },
      ],
    },
    {
      patientId: patientByMrn["MRN-1004"].id,
      orderType: "imaging",
      testName: "موجات فوق صوتية على القلب (Echo)",
      priority: "routine",
      indication: "تقييم وظيفة عضلة القلب",
      status: "ordered",
      results: [],
    },
  ];

  for (const o of labOrderSeedData) {
    const order = await prisma.labOrder.create({
      data: {
        organizationId: organization.id,
        patientId: o.patientId,
        orderedById: adminUser.id,
        orderType: o.orderType,
        testName: o.testName,
        priority: o.priority,
        indication: o.indication,
        status: o.status,
      },
    });
    if (o.results.length) {
      await prisma.labResult.createMany({
        data: o.results.map((r) => ({
          organizationId: organization.id,
          patientId: o.patientId,
          orderId: order.id,
          ...r,
        })),
      });
    }
  }

  // ---- Procedure orders ----
  await prisma.procedureOrder.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1004"].id,
        orderedById: adminUser.id,
        serviceCatalogId: serviceCatalogByCode["US"].id,
        procedureName: "موجات فوق صوتية على القلب",
        status: "scheduled",
        scheduledAt: daysFromNow(2, 14, 15),
        notes: "تقييم الكفاءة الانقباضية لعضلة القلب",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1005"].id,
        orderedById: adminUser.id,
        serviceCatalogId: serviceCatalogByCode["VITD"].id,
        procedureName: "تحليل فيتامين د",
        status: "ordered",
        notes: "تقييم نقص فيتامين د",
      },
    ],
  });

  // ---- Documents ----
  await prisma.document.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        name: "خطة علاج الضغط",
        type: "consent",
        storageKey: "documents/MRN-1001/care-plan.pdf",
        mimeType: "application/pdf",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1003"].id,
        name: "ملخص نتائج السكر التراكمي",
        type: "lab_report",
        storageKey: "documents/MRN-1003/hba1c-summary.pdf",
        mimeType: "application/pdf",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1002"].id,
        name: "نموذج الفحص الشامل",
        type: "id",
        storageKey: "documents/MRN-1002/intake.pdf",
        mimeType: "application/pdf",
      },
    ],
  });

  // ---- Consents ----
  await prisma.consent.createMany({
    data: [
      {
        patientId: patientByMrn["MRN-1001"].id,
        organizationId: organization.id,
        consentType: "HIPAA",
        isGranted: true,
        documentUrl: "/consents/MRN-1001/hipaa.pdf",
        signedAt: daysFromNow(-40, 11, 0),
      },
      {
        patientId: patientByMrn["MRN-1002"].id,
        organizationId: organization.id,
        consentType: "treatment",
        isGranted: true,
        documentUrl: "/consents/MRN-1002/treatment.pdf",
        signedAt: daysFromNow(-25, 12, 0),
      },
      {
        patientId: patientByMrn["MRN-1006"].id,
        organizationId: organization.id,
        consentType: "data_usage",
        isGranted: true,
        documentUrl: "/consents/MRN-1006/data-usage.pdf",
        signedAt: daysFromNow(-5, 10, 30),
      },
    ],
  });

  // ---- Insurance policies + claims ----
  await prisma.insurancePolicy.createMany({
    data: [
      {
        patientId: patientByMrn["MRN-1001"].id,
        provider: "التأمين الصحي الشامل",
        policyNumber: "SHI-2024-ALX-77881",
        groupNumber: "GRP-ALX-01",
        type: "primary",
      },
      {
        patientId: patientByMrn["MRN-1003"].id,
        provider: "مصر للتأمين الطبي",
        policyNumber: "MI-2025-88273",
        groupNumber: "GRP-002",
        type: "primary",
      },
    ],
  });

  await prisma.insuranceClaim.createMany({
    data: [
      {
        organizationId: organization.id,
        claimNumber: "CLM-ALX-2026-001",
        status: "paid",
        amountClaimed: "600.00",
        amountPaid: "600.00",
        submittedAt: daysFromNow(-12, 10, 0),
        paidAt: daysFromNow(-6, 11, 30),
      },
      {
        organizationId: organization.id,
        claimNumber: "CLM-ALX-2026-002",
        status: "pending",
        amountClaimed: "800.00",
        amountPaid: null,
        submittedAt: daysFromNow(-3, 12, 0),
        paidAt: null,
      },
    ],
  });

  // ---- Invoices (EGP) + payments ----
  const invoices = [];
  const invoiceSeedData = [
    {
      patientId: patientByMrn["MRN-1001"].id,
      invoiceNumber: "INV-2026-000101",
      currency: "EGP",
      status: "partially_paid",
      totalAmount: "620.00",
      amountPaid: "300.00",
      dueDate: daysFromNow(7, 0, 0),
      lineItems: [
        { description: "كشف استشاري - متابعة ضغط", quantity: 1, unitPrice: "300.00", amount: "300.00", cptCode: "VISIT-SP", serviceCatalogId: serviceCatalogByCode["VISIT-SP"].id, encounterId: encounters[1].id },
        { description: "رسم قلب ECG", quantity: 1, unitPrice: "250.00", amount: "250.00", cptCode: "ECG", serviceCatalogId: serviceCatalogByCode["ECG"].id, encounterId: encounters[1].id },
        { description: "حقنة عضل", quantity: 2, unitPrice: "35.00", amount: "70.00", cptCode: "PROC-INJ", serviceCatalogId: serviceCatalogByCode["PROC-INJ"].id },
      ],
      payments: [
        { amount: "300.00", paymentMethod: "cash", status: "completed", stripePaymentId: null },
      ],
    },
    {
      patientId: patientByMrn["MRN-1003"].id,
      invoiceNumber: "INV-2026-000102",
      currency: "EGP",
      status: "paid",
      totalAmount: "480.00",
      amountPaid: "480.00",
      dueDate: daysFromNow(-1, 0, 0),
      lineItems: [
        { description: "كشف استشاري - مراجعة سكر", quantity: 1, unitPrice: "300.00", amount: "300.00", cptCode: "VISIT-SP", serviceCatalogId: serviceCatalogByCode["VISIT-SP"].id, encounterId: encounters[0].id },
        { description: "سكر تراكمي HbA1c", quantity: 1, unitPrice: "180.00", amount: "180.00", cptCode: "HBA1C", serviceCatalogId: serviceCatalogByCode["HBA1C"].id },
      ],
      payments: [
        { amount: "480.00", paymentMethod: "insurance", status: "completed", stripePaymentId: null },
      ],
    },
    {
      patientId: patientByMrn["MRN-1004"].id,
      invoiceNumber: "INV-2026-000103",
      currency: "EGP",
      status: "sent",
      totalAmount: "500.00",
      amountPaid: "0.00",
      dueDate: daysFromNow(14, 0, 0),
      lineItems: [
        { description: "موجات فوق صوتية على القلب", quantity: 1, unitPrice: "500.00", amount: "500.00", cptCode: "US", serviceCatalogId: serviceCatalogByCode["US"].id },
      ],
      payments: [],
    },
  ];

  for (const invoiceData of invoiceSeedData) {
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        patientId: invoiceData.patientId,
        invoiceNumber: invoiceData.invoiceNumber,
        currency: "EGP",
        status: invoiceData.status,
        totalAmount: invoiceData.totalAmount,
        amountPaid: invoiceData.amountPaid,
        dueDate: invoiceData.dueDate,
      },
    });

    await prisma.invoiceLineItem.createMany({
      data: invoiceData.lineItems.map((lineItem) => ({
        invoiceId: invoice.id,
        description: lineItem.description,
        quantity: lineItem.quantity,
        unitPrice: lineItem.unitPrice,
        amount: lineItem.amount,
        cptCode: lineItem.cptCode,
        serviceCatalogId: lineItem.serviceCatalogId ?? null,
        encounterId: lineItem.encounterId ?? null,
      })),
    });

    if (invoiceData.payments.length > 0) {
      await prisma.payment.createMany({
        data: invoiceData.payments.map((payment) => ({
          invoiceId: invoice.id,
          ...payment,
        })),
      });
    }

    invoices.push(invoice);
  }

  // ---- Inventory (Egyptian supplies) ----
  const inventoryItems = [];
  for (const inventoryData of [
    { name: "كونكور Cor 5mg", sku: "MED-COR-5", category: "medication", quantity: 120, reorderLevel: 40, unit: "علبة" },
    { name: "جلوكوفاج 500mg", sku: "MED-GLU-500", category: "medication", quantity: 90, reorderLevel: 30, unit: "شريط" },
    { name: "بانادول إكسترا", sku: "MED-PAN-EX", category: "medication", quantity: 200, reorderLevel: 60, unit: "شريط" },
    { name: "قفازات نيتريل", sku: "SUP-GLV-NIT", category: "consumable", quantity: 500, reorderLevel: 150, unit: "زوج" },
    { name: "محاقن 5cc", sku: "SUP-SYR-5", category: "consumable", quantity: 800, reorderLevel: 200, unit: "قطعة" },
    { name: "كحول طبي 70%", sku: "SUP-ALC-70", category: "consumable", quantity: 300, reorderLevel: 80, unit: "زجاجة" },
    { name: "شاش طبي معقم", sku: "SUP-GAUZE", category: "consumable", quantity: 150, reorderLevel: 40, unit: "لفافة" },
  ]) {
    inventoryItems.push(
      await prisma.inventoryItem.create({
        data: {
          organizationId: organization.id,
          ...inventoryData,
        },
      }),
    );
  }

  await prisma.inventoryTransaction.createMany({
    data: [
      {
        itemId: inventoryItems[0].id,
        type: "restock",
        quantity: 120,
        reason: "توريد أسبوعي من الصيدلية",
      },
      {
        itemId: inventoryItems[3].id,
        type: "usage",
        quantity: -80,
        reason: "استهلاك يومي للعيادة",
      },
      {
        itemId: inventoryItems[4].id,
        type: "restock",
        quantity: 300,
        reason: "توريد شهري",
      },
      {
        itemId: inventoryItems[5].id,
        type: "adjustment",
        quantity: -10,
        reason: "جرد المخزن",
      },
    ],
  });

  // ---- Communications (SMS/WhatsApp - dominant in Egypt) ----
  await prisma.communication.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        channel: "sms",
        type: "reminder",
        status: "sent",
        content: "تذكير: موعدكم اليوم الساعة 10:00 صباحاً في مركز الإسكندرية الطبي - سموحة.",
        sentAt: daysFromNow(0, 9, 0),
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1002"].id,
        channel: "whatsapp",
        type: "notification",
        status: "delivered",
        content: "تم إرسال تعليمات الفحص الشامل عبر واتساب.",
        sentAt: daysFromNow(-1, 15, 30),
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1006"].id,
        channel: "sms",
        type: "campaign",
        status: "pending",
        content: "عرض خاص لحملة التوعية بالحساسية هذا الأسبوع.",
        scheduledFor: daysFromNow(1, 12, 0),
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1004"].id,
        channel: "whatsapp",
        type: "reminder",
        status: "sent",
        content: "تأكيد موعد الموجات فوق الصوتية يوم الثلاثاء.",
        sentAt: daysFromNow(-1, 13, 15),
      },
    ],
  });

  await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      name: "حملة التوعية بالسكر وضغط الدم",
      type: "drip",
      status: "active",
      triggerType: "chronic_care",
    },
  });

  // ---- Tasks ----
  await prisma.task.createMany({
    data: [
      {
        organizationId: organization.id,
        title: "مراجعة نتيجة السكر التراكمي",
        description: "الاتصال بمحمد كامل لمناقشة النتائج والتوجيه الغذائي.",
        status: "open",
        priority: "high",
        dueDate: daysFromNow(1, 11, 0),
        patientId: patientByMrn["MRN-1003"].id,
        assigneeId: coordinatorUser.id,
        creatorId: adminUser.id,
        taskType: "lab_review",
      },
      {
        organizationId: organization.id,
        title: "تحصيل الرصيد المتبقي",
        description: "متابعة الدفعة المتبقية من فاتورة INV-2026-000101.",
        status: "in_progress",
        priority: "medium",
        dueDate: daysFromNow(2, 14, 0),
        patientId: patientByMrn["MRN-1001"].id,
        assigneeId: billingUser.id,
        creatorId: adminUser.id,
        taskType: "claim_followup",
      },
      {
        organizationId: organization.id,
        title: "تجهيز حزمة الفحص الشامل",
        description: "رفع الاستبيان قبل موعد فاطمة حسن.",
        status: "open",
        priority: "low",
        dueDate: daysFromNow(1, 17, 0),
        patientId: patientByMrn["MRN-1002"].id,
        assigneeId: coordinatorUser.id,
        creatorId: coordinatorUser.id,
        taskType: "follow_up",
      },
    ],
  });

  // ---- Waitlist ----
  await prisma.waitlistEntry.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1004"].id,
        preferredDate: daysFromNow(6, 10, 0),
        notes: "يفضل حجز الفترة الصباحية إن توفر موعد ملغي.",
        status: "waiting",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1006"].id,
        preferredDate: daysFromNow(8, 18, 30),
        notes: "أي موعد قبل ورشة التوعية.",
        status: "offered",
      },
    ],
  });

  // ---- Feedback survey ----
  await prisma.feedbackSurvey.createMany({
    data: [
      {
        patientId: patientByMrn["MRN-1003"].id,
        encounterId: encounters[0].id,
        npsScore: 9,
        feedback: "خدمة ممتازة والتشخيص دقيق.",
        sentAt: daysFromNow(-1, 16, 0),
        respondedAt: daysFromNow(-1, 18, 30),
      },
    ],
  });

  // ---- Notifications ----
  await prisma.notification.createMany({
    data: [
      {
        organizationId: organization.id,
        recipientId: adminUser.id,
        channel: "in_app",
        title: "موعد جديد",
        body: "موعد متابعة ضغط الدم - أحمد سيد، اليوم 10:00 صباحاً.",
        entityType: "Appointment",
        entityId: appointments[0].id,
        status: "unread",
      },
      {
        organizationId: organization.id,
        recipientId: billingUser.id,
        channel: "in_app",
        title: "فاتورة مستحقة",
        body: "فاتورة INV-2026-000103 أُرسلت للمريض مريم عادل.",
        entityType: "Invoice",
        entityId: invoices[2].id,
        status: "unread",
      },
      {
        organizationId: organization.id,
        recipientId: coordinatorUser.id,
        channel: "in_app",
        title: "نتيجة تحليل تحتاج مراجعة",
        body: "السكر التراكمي 6.9% مرتفع - محمد كامل.",
        entityType: "LabResult",
        entityId: "seed-hba1c-result",
        status: "unread",
      },
    ],
  });

  // ---- Audit logs ----
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: adminUser.id,
        action: "CREATE",
        entityType: "Appointment",
        entityId: appointments[0].id,
        afterState: JSON.stringify({ status: appointments[0].status, type: appointments[0].appointmentType }),
      },
      {
        organizationId: organization.id,
        userId: coordinatorUser.id,
        action: "UPDATE",
        entityType: "Task",
        entityId: "seed-task-status-change",
        beforeState: JSON.stringify({ status: "open" }),
        afterState: JSON.stringify({ status: "in_progress" }),
      },
      {
        organizationId: organization.id,
        userId: billingUser.id,
        action: "CREATE",
        entityType: "Invoice",
        entityId: invoices[0].id,
        afterState: JSON.stringify({ invoiceNumber: "INV-2026-000101" }),
      },
      {
        organizationId: organization.id,
        userId: adminUser.id,
        action: "CREATE",
        entityType: "Prescription",
        entityId: prescriptions[0].id,
        afterState: JSON.stringify({ medication: "كونكور Cor 5mg" }),
      },
    ],
  });

  console.log("Seeded demo staff accounts (all password = admin123):");
  console.log("  admin@acmeclinic.com   - د. أحمد عبد الرحمن (طبيب)");
  console.log("  ops@acmeclinic.com     - سارة محمود (استقبال)");
  console.log("  billing@acmeclinic.com - محمد الشناوي (محاسبة)");
  console.log("Seeded demo patient portal accounts (all password = patient123):");
  for (const p of patientDefinitions) {
    console.log(`  ${p.email}  / ${p.mrn}`);
  }
  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(
      "Seed failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
