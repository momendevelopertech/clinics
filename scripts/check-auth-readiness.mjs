#!/usr/bin/env node
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const { Pool } = pg;

const REQUIRED_ENV_VARS = ["DATABASE_URL", "NEXTAUTH_SECRET"];
const DEMO_STAFF_EMAILS = [
  "admin@acmeclinic.com",
  "ops@acmeclinic.com",
  "billing@acmeclinic.com",
];
const DEMO_PATIENTS = [
  { email: "ahmed.sayed@example.com", mrn: "MRN-1001" },
  { email: "fatma.hassan@example.com", mrn: "MRN-1002" },
  { email: "mohamed.kamel@example.com", mrn: "MRN-1003" },
  { email: "mariam.adel@example.com", mrn: "MRN-1004" },
  { email: "khaled.samy@example.com", mrn: "MRN-1005" },
];
const DEMO_TENANT_PATIENTS = [
  { email: "patient@alexandria.demo.openhealthcrm.test", mrn: "DM-demo-alexandria-family-clinic-001" },
  { email: "patient@smouha.demo.openhealthcrm.test", mrn: "DM-demo-smouha-pediatrics-center-001" },
];

function getCanonicalAuthUrl() {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() ?? "";
  const vercelUrl = process.env.VERCEL_URL?.trim() ?? "";
  const port = process.env.PORT?.trim() || "3000";

  if (nextAuthUrl) {
    return nextAuthUrl;
  }

  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return `http://localhost:${port}`;
  }

  return "";
}

function getStatusLabel(ok) {
  return ok ? "[ok]" : "[missing]";
}

function getWarningLabel(ok) {
  return ok ? "[ok]" : "[warning]";
}

async function main() {
  console.log("Auth readiness check");
  console.log("");

  const missingEnv = REQUIRED_ENV_VARS.filter((name) => !process.env[name]?.trim());
  for (const name of REQUIRED_ENV_VARS) {
    console.log(`${getStatusLabel(!missingEnv.includes(name))} ${name}`);
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() ?? "";
  const canonicalAuthUrl = getCanonicalAuthUrl();
  const canonicalAuthUrlLooksLive =
    canonicalAuthUrl.length > 0 &&
    !canonicalAuthUrl.includes("localhost") &&
    !canonicalAuthUrl.includes("127.0.0.1");

  console.log(
    `${getWarningLabel(Boolean(canonicalAuthUrl))} Auth origin: ${
      canonicalAuthUrl || "missing NEXTAUTH_URL or VERCEL_URL"
    }`,
  );

  if (nextAuthUrl) {
    console.log(
      `${getWarningLabel(canonicalAuthUrlLooksLive)} NEXTAUTH_URL value: ${nextAuthUrl}`,
    );
  } else if (process.env.NODE_ENV !== "production") {
    console.log(
      `[ok] Local auth origin inferred from PORT: http://localhost:${process.env.PORT?.trim() || "3000"}`,
    );
  }

  if (missingEnv.length > 0) {
    console.error("");
    console.error("Required auth env vars are missing.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("[ok] Database connectivity");

    const staffUsers = await prisma.user.findMany({
      where: { email: { in: DEMO_STAFF_EMAILS } },
      select: {
        email: true,
        organizationId: true,
      },
      orderBy: { email: "asc" },
    });

    const patients = await prisma.patient.findMany({
      where: {
        OR: DEMO_PATIENTS.map((patient) => ({
          email: patient.email,
          mrn: patient.mrn,
        })),
      },
      select: {
        email: true,
        mrn: true,
        organizationId: true,
      },
      orderBy: [{ mrn: "asc" }],
    });
    const demoTenantPatients = await prisma.patient.findMany({
      where: {
        OR: DEMO_TENANT_PATIENTS.map((patient) => ({
          email: patient.email,
          mrn: patient.mrn,
        })),
      },
      select: { email: true, mrn: true, organizationId: true, passwordHash: true },
      orderBy: [{ mrn: "asc" }],
    });
    await prisma.patientSession.count();
    await prisma.auditLog.count();

    console.log("");
    console.log(
      `${getStatusLabel(staffUsers.length === DEMO_STAFF_EMAILS.length)} Demo staff accounts: ${staffUsers.length}/${DEMO_STAFF_EMAILS.length}`,
    );
    for (const email of DEMO_STAFF_EMAILS) {
      const user = staffUsers.find((entry) => entry.email === email);
      console.log(`${getStatusLabel(Boolean(user))} ${email}`);
    }

    console.log("");
    console.log(
      `${getStatusLabel(patients.length === DEMO_PATIENTS.length)} Demo patient accounts: ${patients.length}/${DEMO_PATIENTS.length}`,
    );
    for (const demoPatient of DEMO_PATIENTS) {
      const patient = patients.find(
        (entry) =>
          entry.email === demoPatient.email && entry.mrn === demoPatient.mrn,
      );
      console.log(
        `${getStatusLabel(Boolean(patient))} ${demoPatient.email} / ${demoPatient.mrn}`,
      );
    }

    console.log("");
    console.log(
      `${getStatusLabel(demoTenantPatients.length === DEMO_TENANT_PATIENTS.length && demoTenantPatients.every((patient) => Boolean(patient.passwordHash)))} Demo tenant patient accounts: ${demoTenantPatients.length}/${DEMO_TENANT_PATIENTS.length}`,
    );
    for (const demoPatient of DEMO_TENANT_PATIENTS) {
      const patient = demoTenantPatients.find(
        (entry) => entry.email === demoPatient.email && entry.mrn === demoPatient.mrn,
      );
      console.log(
        `${getStatusLabel(Boolean(patient?.passwordHash))} ${demoPatient.email} / ${demoPatient.mrn}`,
      );
    }

    console.log("");
    console.log("[ok] PatientSession table available");
    console.log("[ok] AuditLog table available");

    console.log("");
    if (
      staffUsers.length !== DEMO_STAFF_EMAILS.length ||
      patients.length !== DEMO_PATIENTS.length ||
      demoTenantPatients.length !== DEMO_TENANT_PATIENTS.length ||
      demoTenantPatients.some((patient) => !patient.passwordHash)
    ) {
      console.log("Result: demo accounts are not fully provisioned in this database.");
      console.log("Action: run `npm run db:seed` against this environment if demo logins should exist.");
      process.exitCode = 2;
      return;
    }

    if (process.env.NODE_ENV === "production" && !canonicalAuthUrlLooksLive) {
      console.log("Result: demo accounts exist, but the auth origin looks non-production.");
      console.log("Action: set NEXTAUTH_URL to the deployed HTTPS origin, or verify VERCEL_URL is present.");
      process.exitCode = 2;
      return;
    }

    console.log("Result: required auth env vars are present and demo credentials exist.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("");
  console.error("[error] Auth readiness check failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
