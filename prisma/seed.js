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

async function clearOperationalData({ orgId, patientIds, appointmentIds, encounterIds, invoiceIds, inventoryItemIds }) {
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
  await prisma.vital.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.prescription.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.labResult.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.document.deleteMany({
    where: { organizationId: orgId },
  });
  await prisma.communication.deleteMany({
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
  await prisma.payment.deleteMany({
    where: { invoiceId: { in: invoiceIds } },
  });
  await prisma.invoice.deleteMany({
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
  await prisma.campaign.deleteMany({
    where: { organizationId: orgId },
  });
}

async function main() {
  console.log("Starting seed...");

  const adminPasswordHash = hashPassword("admin123");
  const patientPasswordHash = hashPassword("patient123");

  const superOrg = await prisma.organization.upsert({
    where: { slug: "platform-admin" },
    update: {
      name: "Platform Administration",
      status: "active",
      plan: "plus",
      onboardingSource: "manual",
      settingsJson: JSON.stringify({ appointmentDurationMins: 30 }),
    },
    create: {
      name: "Platform Administration",
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
      name: "Platform Super Admin",
      role: "superAdmin",
      active: true,
      emailVerified: true,
    },
    create: {
      organizationId: superOrg.id,
      email: "superadmin@acmeclinic.com",
      name: "Platform Super Admin",
      role: "superAdmin",
      active: true,
      emailVerified: true,
      passwordHash: adminPasswordHash,
    },
  });
  await ensureUserRole(superAdminUser.id, superAdminRole.id);

  let organization = await prisma.organization.findFirst({
    where: { name: "Acme Clinic" },
  });
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: "Acme Clinic",
        slug: "acme-clinic",
        timezone: "America/New_York",
        currency: "USD",
        status: "active",
        plan: "clinic",
        onboardingSource: "manual",
        settingsJson: JSON.stringify({
          appointmentDurationMins: 30,
          openTime: "09:00",
          closeTime: "17:00",
        }),
      },
    });
  } else {
    organization = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        slug: "acme-clinic",
        status: "active",
        plan: "clinic",
        onboardingSource: "manual",
      },
    });
  }

  console.log("Organization:", organization.id);

  let mainBranch = await prisma.branch.findFirst({
    where: { organizationId: organization.id, name: "Main Branch" },
  });
  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        organizationId: organization.id,
        name: "Main Branch",
        address: "123 Medical Parkway",
        city: "Boston",
        state: "MA",
        zip: "02110",
        country: "USA",
        status: "active",
      },
    });
  }

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
      name: "Dr. Meredith Cole",
      passwordHash: adminPasswordHash,
      role: "doctor",
      specialty: "Internal Medicine",
      consultationFee: "150",
      availabilityType: "regular",
      availableDays: JSON.stringify(["sun", "mon", "tue", "wed", "thu"]),
      availableFrom: "09:00",
      availableTo: "17:00",
    },
    create: {
      organizationId: organization.id,
      email: "admin@acmeclinic.com",
      name: "Dr. Meredith Cole",
      passwordHash: adminPasswordHash,
      role: "doctor",
      specialty: "Internal Medicine",
      consultationFee: "150",
      availabilityType: "regular",
      availableDays: JSON.stringify(["sun", "mon", "tue", "wed", "thu"]),
      availableFrom: "09:00",
      availableTo: "17:00",
    },
  });

  const coordinatorUser = await prisma.user.upsert({
    where: { email: "ops@acmeclinic.com" },
    update: {
      organizationId: organization.id,
      name: "Jamie Rivera",
      passwordHash: adminPasswordHash,
      role: "receptionist",
    },
    create: {
      organizationId: organization.id,
      email: "ops@acmeclinic.com",
      name: "Jamie Rivera",
      passwordHash: adminPasswordHash,
      role: "receptionist",
    },
  });

  const billingUser = await prisma.user.upsert({
    where: { email: "billing@acmeclinic.com" },
    update: {
      organizationId: organization.id,
      name: "Taylor Brooks",
      passwordHash: adminPasswordHash,
      role: "biller",
    },
    create: {
      organizationId: organization.id,
      email: "billing@acmeclinic.com",
      name: "Taylor Brooks",
      passwordHash: adminPasswordHash,
      role: "biller",
    },
  });

  await ensureUserRole(adminUser.id, doctorRole.id);
  await ensureUserRole(coordinatorUser.id, coordinatorRole.id);
  await ensureUserRole(billingUser.id, billerRole.id);

  const roomRecords = [];
  for (const room of [
    { name: "Consultation Room A", type: "consultation" },
    { name: "Consultation Room B", type: "consultation" },
    { name: "Procedure Suite 1", type: "procedure" },
  ]) {
    let roomRecord = await prisma.room.findFirst({
      where: {
        organizationId: organization.id,
        name: room.name,
      },
    });

    if (!roomRecord) {
      roomRecord = await prisma.room.create({
        data: {
          organizationId: organization.id,
          branchId: mainBranch.id,
          name: room.name,
          type: room.type,
          status: "active",
        },
      });
    } else {
      roomRecord = await prisma.room.update({
        where: { id: roomRecord.id },
        data: { 
          type: room.type,
          branchId: mainBranch.id,
          status: "active",
        },
      });
    }

    roomRecords.push(
      roomRecord,
    );
  }

  const equipmentRecords = [];
  for (const equipment of [
    { name: "Digital X-Ray", type: "xray" },
    { name: "ECG Monitor", type: "diagnostic" },
    { name: "Ultrasound Cart", type: "imaging" },
  ]) {
    let equipmentRecord = await prisma.equipment.findFirst({
      where: {
        organizationId: organization.id,
        name: equipment.name,
      },
    });

    if (!equipmentRecord) {
      equipmentRecord = await prisma.equipment.create({
        data: {
          organizationId: organization.id,
          name: equipment.name,
          type: equipment.type,
        },
      });
    } else {
      equipmentRecord = await prisma.equipment.update({
        where: { id: equipmentRecord.id },
        data: { type: equipment.type },
      });
    }

    equipmentRecords.push(
      equipmentRecord,
    );
  }

  const patientDefinitions = [
    {
      firstName: "John",
      lastName: "Doe",
      mrn: "MRN-1001",
      dateOfBirth: new Date("1980-05-15"),
      gender: "Male",
      email: "john.doe@example.com",
      phone: "555-0101",
      phoneSecondary: "555-1101",
      address: "14 Cedar Street",
      city: "Boston",
      state: "MA",
      zip: "02110",
      country: "USA",
      bloodType: "O+",
      allergies: "Penicillin",
      primaryCareProvider: "Dr. Meredith Cole",
      familyHistory: "Hypertension",
      status: "Active",
      emergencyContact: {
        name: "Emily Doe",
        relationship: "Spouse",
        phone: "555-2101",
        email: "emily.doe@example.com",
      },
    },
    {
      firstName: "Jane",
      lastName: "Smith",
      mrn: "MRN-1002",
      dateOfBirth: new Date("1992-11-20"),
      gender: "Female",
      email: "jane.smith@example.com",
      phone: "555-0202",
      phoneSecondary: "555-1202",
      address: "88 Harbor Avenue",
      city: "Cambridge",
      state: "MA",
      zip: "02139",
      country: "USA",
      bloodType: "A-",
      allergies: "None",
      primaryCareProvider: "Dr. Meredith Cole",
      familyHistory: "Asthma",
      status: "Active",
      emergencyContact: {
        name: "Marcus Smith",
        relationship: "Brother",
        phone: "555-2202",
        email: "marcus.smith@example.com",
      },
    },
    {
      firstName: "Alice",
      lastName: "Johnson",
      mrn: "MRN-1003",
      dateOfBirth: new Date("1975-02-10"),
      gender: "Female",
      email: "alice.j@example.com",
      phone: "555-0303",
      phoneSecondary: "555-1303",
      address: "205 Willow Road",
      city: "Somerville",
      state: "MA",
      zip: "02143",
      country: "USA",
      bloodType: "B+",
      allergies: "Shellfish",
      primaryCareProvider: "Dr. Meredith Cole",
      familyHistory: "Type 2 diabetes",
      status: "Active",
      emergencyContact: {
        name: "Oliver Johnson",
        relationship: "Son",
        phone: "555-2303",
        email: "oliver.johnson@example.com",
      },
    },
    {
      firstName: "Marcus",
      lastName: "Lee",
      mrn: "MRN-1004",
      dateOfBirth: new Date("1968-09-02"),
      gender: "Male",
      email: "marcus.lee@example.com",
      phone: "555-0404",
      phoneSecondary: "555-1404",
      address: "12 Summit Lane",
      city: "Brookline",
      state: "MA",
      zip: "02446",
      country: "USA",
      bloodType: "AB+",
      allergies: "Latex",
      primaryCareProvider: "Dr. Meredith Cole",
      familyHistory: "Coronary artery disease",
      status: "Active",
      emergencyContact: {
        name: "Diana Lee",
        relationship: "Spouse",
        phone: "555-2404",
        email: "diana.lee@example.com",
      },
    },
    {
      firstName: "Priya",
      lastName: "Patel",
      mrn: "MRN-1005",
      dateOfBirth: new Date("1988-07-29"),
      gender: "Female",
      email: "priya.patel@example.com",
      phone: "555-0505",
      phoneSecondary: "555-1505",
      address: "34 Maple Court",
      city: "Newton",
      state: "MA",
      zip: "02458",
      country: "USA",
      bloodType: "O-",
      allergies: "Sulfa drugs",
      primaryCareProvider: "Dr. Meredith Cole",
      familyHistory: "Gestational diabetes",
      status: "Active",
      emergencyContact: {
        name: "Amit Patel",
        relationship: "Partner",
        phone: "555-2505",
        email: "amit.patel@example.com",
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

  await clearOperationalData({
    orgId: organization.id,
    patientIds,
    appointmentIds: existingAppointments.map((entry) => entry.id),
    encounterIds: existingEncounters.map((entry) => entry.id),
    invoiceIds: existingInvoices.map((entry) => entry.id),
    inventoryItemIds: existingInventoryItems.map((entry) => entry.id),
  });

  const patientByMrn = Object.fromEntries(
    patients.map((patient) => [patient.mrn, patient]),
  );

  const appointments = [];
  for (const appointmentData of [
    {
      patientId: patientByMrn["MRN-1001"].id,
      providerId: adminUser.id,
      roomId: roomRecords[0].id,
      startTime: daysFromNow(0, 9, 0),
      endTime: daysFromNow(0, 9, 30),
      appointmentType: "Hypertension Follow-up",
      status: "confirmed",
      notes: "Review home BP log and refill meds",
      reminder24hSent: true,
      reminder1hSent: true,
    },
    {
      patientId: patientByMrn["MRN-1002"].id,
      providerId: adminUser.id,
      roomId: roomRecords[1].id,
      startTime: daysFromNow(0, 10, 30),
      endTime: daysFromNow(0, 11, 0),
      appointmentType: "Annual Wellness Visit",
      status: "scheduled",
      notes: "Preventive screening and vaccines review",
      reminder24hSent: true,
      reminder1hSent: false,
    },
    {
      patientId: patientByMrn["MRN-1003"].id,
      providerId: coordinatorUser.id,
      roomId: roomRecords[2].id,
      startTime: daysFromNow(-1, 14, 0),
      endTime: daysFromNow(-1, 14, 45),
      appointmentType: "Diabetes Medication Review",
      status: "completed",
      notes: "Discuss A1C trend and diet changes",
      reminder24hSent: true,
      reminder1hSent: true,
    },
    {
      patientId: patientByMrn["MRN-1004"].id,
      providerId: adminUser.id,
      roomId: roomRecords[0].id,
      startTime: daysFromNow(2, 13, 15),
      endTime: daysFromNow(2, 14, 0),
      appointmentType: "Cardiology Follow-up",
      status: "scheduled",
      notes: "Stress test results review",
      reminder24hSent: false,
      reminder1hSent: false,
    },
    {
      patientId: patientByMrn["MRN-1005"].id,
      providerId: coordinatorUser.id,
      roomId: roomRecords[1].id,
      startTime: daysFromNow(4, 15, 0),
      endTime: daysFromNow(4, 15, 30),
      appointmentType: "Nutrition Check-in",
      status: "scheduled",
      notes: "Discuss lifestyle plan",
      reminder24hSent: false,
      reminder1hSent: false,
    },
  ]) {
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
      {
        appointmentId: appointments[0].id,
        equipmentId: equipmentRecords[1].id,
      },
      {
        appointmentId: appointments[2].id,
        equipmentId: equipmentRecords[0].id,
      },
    ],
  });

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
        subjective: "Patient reports improved glucose control with fewer afternoon spikes.",
        objective: "Weight down 1.8 kg, fasting glucose log improved, foot exam normal.",
        assessment: "Diabetes stable with improving adherence.",
        plan: "Continue metformin, repeat A1C in 12 weeks, nutrition follow-up.",
      },
      {
        encounterId: encounters[1].id,
        authorId: adminUser.id,
        noteType: "SOAP",
        subjective: "Home blood pressure remains variable in evenings.",
        objective: "BP elevated on intake, repeat improved after seated rest.",
        assessment: "Hypertension needs medication timing adjustment.",
        plan: "Review evening dose timing and order repeat BMP.",
      },
    ],
  });

  await prisma.vital.createMany({
    data: [
      {
        patientId: patientByMrn["MRN-1001"].id,
        encounterId: encounters[1].id,
        weightKg: 86.4,
        heightCm: 178,
        bloodPressureSystolic: 142,
        bloodPressureDiastolic: 88,
        heartRate: 78,
        bmi: 27.3,
        spO2: 98,
        temperature: 36.8,
      },
      {
        patientId: patientByMrn["MRN-1003"].id,
        encounterId: encounters[0].id,
        weightKg: 74.2,
        heightCm: 165,
        bloodPressureSystolic: 128,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        bmi: 27.3,
        spO2: 99,
        temperature: 36.6,
      },
      {
        patientId: patientByMrn["MRN-1004"].id,
        weightKg: 91.5,
        heightCm: 180,
        bloodPressureSystolic: 136,
        bloodPressureDiastolic: 84,
        heartRate: 75,
        bmi: 28.2,
        spO2: 97,
        temperature: 36.9,
      },
    ],
  });

  await prisma.prescription.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        encounterId: encounters[1].id,
        prescribedById: adminUser.id,
        medicationName: "Lisinopril",
        dosage: "20 mg",
        frequency: "Once daily",
        duration: "90 days",
        instructions: "Take in the evening with water.",
        status: "active",
        sentToPharmacy: true,
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1003"].id,
        encounterId: encounters[0].id,
        prescribedById: adminUser.id,
        medicationName: "Metformin XR",
        dosage: "500 mg",
        frequency: "Twice daily",
        duration: "90 days",
        instructions: "Take with meals.",
        status: "active",
        sentToPharmacy: true,
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1004"].id,
        prescribedById: adminUser.id,
        medicationName: "Atorvastatin",
        dosage: "40 mg",
        frequency: "Nightly",
        duration: "60 days",
        instructions: "Monitor for muscle soreness.",
        status: "active",
        sentToPharmacy: false,
      },
    ],
  });

  await prisma.labResult.createMany({
    data: [
      {
        patientId: patientByMrn["MRN-1001"].id,
        testName: "Basic Metabolic Panel",
        resultValue: "Within range",
        unit: null,
        referenceRange: "Normal",
        status: "completed",
        performedAt: daysFromNow(-2, 8, 0),
        reportUrl: "/reports/john-doe-bmp.pdf",
      },
      {
        patientId: patientByMrn["MRN-1003"].id,
        testName: "Hemoglobin A1C",
        resultValue: "6.8",
        unit: "%",
        referenceRange: "4.8 - 5.6",
        status: "abnormal",
        performedAt: daysFromNow(-3, 9, 0),
        reportUrl: "/reports/alice-johnson-a1c.pdf",
      },
      {
        patientId: patientByMrn["MRN-1004"].id,
        testName: "Lipid Panel",
        resultValue: "Pending review",
        unit: null,
        referenceRange: "Provider review needed",
        status: "pending",
        performedAt: daysFromNow(-1, 7, 45),
        reportUrl: null,
      },
      {
        patientId: patientByMrn["MRN-1005"].id,
        testName: "Vitamin D",
        resultValue: "31",
        unit: "ng/mL",
        referenceRange: "30 - 100",
        status: "completed",
        performedAt: daysFromNow(-5, 10, 30),
        reportUrl: "/reports/priya-patel-vitd.pdf",
      },
    ],
  });

  const invoices = [];
  for (const invoiceData of [
    {
      patientId: patientByMrn["MRN-1001"].id,
      invoiceNumber: "INV-DEMO-1001",
      status: "partially_paid",
      totalAmount: "245.00",
      amountPaid: "120.00",
      dueDate: daysFromNow(7, 0, 0),
      lineItems: [
        { description: "Hypertension follow-up", quantity: 1, unitPrice: "125.00", amount: "125.00", cptCode: "99214" },
        { description: "BMP lab processing", quantity: 1, unitPrice: "120.00", amount: "120.00", cptCode: "80048" },
      ],
      payments: [
        { amount: "120.00", paymentMethod: "card", status: "completed", stripePaymentId: "pi_demo_1001" },
      ],
    },
    {
      patientId: patientByMrn["MRN-1003"].id,
      invoiceNumber: "INV-DEMO-1002",
      status: "paid",
      totalAmount: "180.00",
      amountPaid: "180.00",
      dueDate: daysFromNow(-2, 0, 0),
      lineItems: [
        { description: "Diabetes medication review", quantity: 1, unitPrice: "180.00", amount: "180.00", cptCode: "99213" },
      ],
      payments: [
        { amount: "180.00", paymentMethod: "insurance", status: "completed", stripePaymentId: null },
      ],
    },
    {
      patientId: patientByMrn["MRN-1004"].id,
      invoiceNumber: "INV-DEMO-1003",
      status: "sent",
      totalAmount: "320.00",
      amountPaid: "0.00",
      dueDate: daysFromNow(14, 0, 0),
      lineItems: [
        { description: "Cardiology follow-up", quantity: 1, unitPrice: "220.00", amount: "220.00", cptCode: "99215" },
        { description: "EKG interpretation", quantity: 1, unitPrice: "100.00", amount: "100.00", cptCode: "93010" },
      ],
      payments: [],
    },
  ]) {
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        patientId: invoiceData.patientId,
        invoiceNumber: invoiceData.invoiceNumber,
        status: invoiceData.status,
        totalAmount: invoiceData.totalAmount,
        amountPaid: invoiceData.amountPaid,
        dueDate: invoiceData.dueDate,
      },
    });

    await prisma.invoiceLineItem.createMany({
      data: invoiceData.lineItems.map((lineItem) => ({
        invoiceId: invoice.id,
        ...lineItem,
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

  const inventoryItems = [];
  for (const inventoryData of [
    { name: "Lisinopril 20mg", sku: "MED-LIS-20", category: "medication", quantity: 84, reorderLevel: 40, unit: "tablet" },
    { name: "Nitrile Gloves", sku: "SUP-GLV-NIT", category: "consumable", quantity: 420, reorderLevel: 150, unit: "pair" },
    { name: "ECG Electrodes", sku: "SUP-ECG-EL", category: "device", quantity: 62, reorderLevel: 25, unit: "pack" },
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
        reason: "Monthly medication restock",
      },
      {
        itemId: inventoryItems[1].id,
        type: "usage",
        quantity: -48,
        reason: "Daily clinic usage",
      },
      {
        itemId: inventoryItems[2].id,
        type: "adjustment",
        quantity: -6,
        reason: "Inventory count correction",
      },
    ],
  });

  await prisma.communication.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        channel: "sms",
        type: "reminder",
        status: "sent",
        content: "Reminder: hypertension follow-up today at 9:00 AM.",
        sentAt: daysFromNow(0, 7, 30),
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1002"].id,
        channel: "email",
        type: "notification",
        status: "delivered",
        content: "Annual wellness prep instructions were sent to your inbox.",
        sentAt: daysFromNow(-1, 16, 15),
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1005"].id,
        channel: "whatsapp",
        type: "campaign",
        status: "pending",
        content: "Join our nutrition coaching workshop this Friday.",
        scheduledFor: daysFromNow(1, 11, 0),
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1004"].id,
        channel: "email",
        type: "reminder",
        status: "sent",
        content: "Cardiology follow-up visit confirmed for this week.",
        sentAt: daysFromNow(-1, 12, 45),
      },
    ],
  });

  await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      name: "Post-Visit Recovery Check-In",
      type: "drip",
      status: "active",
      triggerType: "post_visit",
    },
  });

  await prisma.task.createMany({
    data: [
      {
        organizationId: organization.id,
        title: "Review abnormal A1C result",
        description: "Call Alice Johnson to discuss trend and education follow-up.",
        status: "open",
        priority: "high",
        dueDate: daysFromNow(1, 9, 0),
        patientId: patientByMrn["MRN-1003"].id,
        assigneeId: coordinatorUser.id,
        creatorId: adminUser.id,
        taskType: "lab_review",
      },
      {
        organizationId: organization.id,
        title: "Collect remaining balance",
        description: "Follow up on partial payment for John Doe invoice INV-DEMO-1001.",
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
        title: "Prepare wellness packet",
        description: "Upload pre-visit questionnaire before Jane Smith appointment.",
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

  await prisma.document.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1001"].id,
        name: "Hypertension Care Plan",
        type: "consent",
        storageKey: "documents/MRN-1001/hypertension-care-plan.pdf",
        mimeType: "application/pdf",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1002"].id,
        name: "Wellness Intake Form",
        type: "id",
        storageKey: "documents/MRN-1002/wellness-intake-form.pdf",
        mimeType: "application/pdf",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1003"].id,
        name: "A1C Trend Summary",
        type: "lab_report",
        storageKey: "documents/MRN-1003/a1c-trend-summary.pdf",
        mimeType: "application/pdf",
      },
    ],
  });

  await prisma.consent.createMany({
    data: [
      {
        patientId: patientByMrn["MRN-1001"].id,
        organizationId: organization.id,
        consentType: "HIPAA",
        isGranted: true,
        documentUrl: "/consents/john-doe-hipaa.pdf",
        signedAt: daysFromNow(-30, 9, 0),
      },
      {
        patientId: patientByMrn["MRN-1002"].id,
        organizationId: organization.id,
        consentType: "treatment",
        isGranted: true,
        documentUrl: "/consents/jane-smith-treatment.pdf",
        signedAt: daysFromNow(-18, 10, 0),
      },
      {
        patientId: patientByMrn["MRN-1005"].id,
        organizationId: organization.id,
        consentType: "data_usage",
        isGranted: true,
        documentUrl: "/consents/priya-patel-data-usage.pdf",
        signedAt: daysFromNow(-10, 8, 30),
      },
    ],
  });

  await prisma.waitlistEntry.createMany({
    data: [
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1004"].id,
        preferredDate: daysFromNow(5, 10, 0),
        notes: "Prefers morning slot if cancellation opens.",
        status: "waiting",
      },
      {
        organizationId: organization.id,
        patientId: patientByMrn["MRN-1005"].id,
        preferredDate: daysFromNow(7, 13, 30),
        notes: "Any slot before nutrition workshop.",
        status: "offered",
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: adminUser.id,
        action: "CREATE",
        entityType: "Appointment",
        entityId: appointments[0].id,
        afterState: JSON.stringify({ status: appointments[0].status }),
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
        afterState: JSON.stringify({ invoiceNumber: "INV-DEMO-1001" }),
      },
    ],
  });

  console.log("Seeded demo users:");
  console.log("  Staff: admin@acmeclinic.com / admin123");
  console.log("  Staff: ops@acmeclinic.com / admin123");
  console.log("  Staff: billing@acmeclinic.com / admin123");
  console.log("Seeded demo patient portal credentials:");
  console.log("  john.doe@example.com / patient123 / MRN-1001");
  console.log("  jane.smith@example.com / patient123 / MRN-1002");
  console.log("  alice.j@example.com / patient123 / MRN-1003");
  console.log("  marcus.lee@example.com / patient123 / MRN-1004");
  console.log("  priya.patel@example.com / patient123 / MRN-1005");
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
