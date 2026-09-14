import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createIntegrationClient, loadIntegrationDatabaseUrl } from "./db";

// Phase C regression guard: seed coverage minimums per SEED_COVERAGE_REPORT.md.
// Fails loudly if a future seed run drops master/catalog/test data.

const dbUrl = loadIntegrationDatabaseUrl();
const describeDb = dbUrl ? describe : describe.skip;

let prisma: PrismaClient;
let orgId: string;

beforeAll(async () => {
  prisma = createIntegrationClient(dbUrl);
  const first = await prisma.patient.findFirst({ select: { organizationId: true } });
  if (!first) throw new Error("Integration DB must be seeded with patients.");
  orgId = first.organizationId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describeDb("seed coverage minimums (integration)", () => {
  it("catalogs and providers are populated", async () => {
    const services = await prisma.serviceCatalog.count({ where: { organizationId: orgId, active: true } });
    const icd = await prisma.clinicalCatalog.count({ where: { organizationId: orgId, system: "ICD10" } });
    const lab = await prisma.clinicalCatalog.count({ where: { organizationId: orgId, system: "LAB" } });
    const providers = await prisma.insuranceProvider.count({ where: { organizationId: orgId, active: true } });
    expect(services).toBeGreaterThanOrEqual(12);
    expect(icd).toBeGreaterThanOrEqual(7);
    expect(lab).toBeGreaterThanOrEqual(9);
    expect(providers).toBeGreaterThanOrEqual(5);
  });

  it("templates, coupons, shifts and engagement seeds exist", async () => {
    const where = { organizationId: orgId };
    const [soap, rxTpl, coupons, shifts, packages, plans, forms, expenses, feedbacks] = await Promise.all([
      prisma.clinicalTemplate.count({ where }),
      prisma.prescriptionTemplate.count({ where }),
      prisma.coupon.count({ where }),
      prisma.shift.count({ where }),
      prisma.servicePackage.count({ where }),
      prisma.treatmentPlan.count({ where }),
      prisma.intakeForm.count({ where }),
      prisma.expense.count({ where }),
      prisma.feedback.count({ where }),
    ]);
    expect(soap).toBeGreaterThanOrEqual(3);
    expect(rxTpl).toBeGreaterThanOrEqual(4);
    expect(coupons).toBeGreaterThanOrEqual(3);
    expect(shifts).toBeGreaterThanOrEqual(10);
    expect(packages).toBeGreaterThanOrEqual(2);
    expect(plans).toBeGreaterThanOrEqual(1);
    expect(forms).toBeGreaterThanOrEqual(1);
    expect(expenses).toBeGreaterThanOrEqual(4);
    expect(feedbacks).toBeGreaterThanOrEqual(3);
  });

  it("operational and edge-case seeds exist", async () => {
    const where = { organizationId: orgId };
    const [allergies, reports, maint, apiKeys, webhooks, patients, appointments, invoices] = await Promise.all([
      prisma.patientAllergy.count({ where }),
      prisma.reportSchedule.count({ where }),
      prisma.equipmentMaintenance.count({ where }),
      prisma.apiKey.count({ where }),
      prisma.webhook.count({ where }),
      prisma.patient.count({ where }),
      prisma.appointment.count({ where }),
      prisma.invoice.count({ where }),
    ]);
    expect(allergies).toBeGreaterThanOrEqual(3);
    expect(reports).toBeGreaterThanOrEqual(1);
    expect(maint).toBeGreaterThanOrEqual(2);
    expect(apiKeys).toBeGreaterThanOrEqual(1);
    expect(webhooks).toBeGreaterThanOrEqual(1);
    expect(patients).toBeGreaterThanOrEqual(20);
    expect(appointments).toBeGreaterThanOrEqual(30);
    expect(invoices).toBeGreaterThanOrEqual(10);
  });
});
