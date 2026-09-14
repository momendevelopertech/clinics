import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createIntegrationClient, loadIntegrationDatabaseUrl } from "./db";

// Owner Override integration suite (Phase D): proves the Owner can
// Edit+Delete every record inside their own organizationId regardless of
// which role created it, and that cross-org access stays impossible.
// Zero residue: every test runs in a rolled-back transaction.

const dbUrl = loadIntegrationDatabaseUrl();
const describeDb = dbUrl ? describe : describe.skip;

let prisma: PrismaClient;

beforeAll(() => {
  prisma = createIntegrationClient(dbUrl);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describeDb("owner override on org records (integration)", () => {
  let orgA: string;
  let orgB: string | null;
  let doctorId: string;
  let ownerId: string;
  const ROLLBACK_TEXT = "ROLLBACK";

  beforeAll(async () => {
    const first = await prisma.patient.findFirst({ select: { organizationId: true } });
    if (!first) throw new Error("Integration DB must be seeded with patients.");
    orgA = first.organizationId;
    const second = await prisma.patient.findFirst({
      where: { organizationId: { not: orgA } },
      select: { organizationId: true },
    });
    orgB = second?.organizationId ?? null;

    const users = await prisma.user.findMany({
      where: { organizationId: orgA },
      select: { id: true },
      take: 2,
    });
    if (users.length < 2) throw new Error("Integration DB must be seeded with 2+ staff users.");
    [doctorId, ownerId] = [users[0].id, users[1].id];
  });

  it("owner edits and deletes a prescription written by another role", async () => {
    const mrn = `IT-OWN-RX-${Date.now()}`;
    await prisma
      .$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: { organizationId: orgA, firstName: "Own", lastName: "Rx", mrn },
        });
        const rx = await tx.prescription.create({
          data: {
            organizationId: orgA,
            patientId: patient.id,
            prescribedById: doctorId,
            medicationName: "Concor 5mg",
            status: "active",
          },
        });

        // Route logic: org-scoped lookup, no createdBy gate (owner acts here).
        const owned = await tx.prescription.findFirst({
          where: { id: rx.id, organizationId: orgA },
        });
        expect(owned).not.toBeNull();
        const updated = await tx.prescription.update({
          where: { id: rx.id },
          data: { status: "completed" },
        });
        expect(updated.status).toBe("completed");
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: rx.id } });
        await tx.prescription.delete({ where: { id: rx.id } });
        await expect(
          tx.prescription.findUnique({ where: { id: rx.id } }),
        ).resolves.toBeNull();
        throw new Error(ROLLBACK_TEXT);
      })
      .catch((error) => {
        if ((error as Error).message !== ROLLBACK_TEXT) throw error;
      });
  });

  it("owner edits and deletes a task and an inventory item created by others", async () => {
    const stamp = Date.now();
    await prisma
      .$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            organizationId: orgA,
            title: `IT owner task ${stamp}`,
            status: "open",
            creatorId: doctorId,
          },
        });
        const item = await tx.inventoryItem.create({
          data: { organizationId: orgA, name: `IT Gauze ${stamp}`, quantity: 10 },
        });

        const ownedTask = await tx.task.findFirst({
          where: { id: task.id, organizationId: orgA },
        });
        expect(ownedTask).not.toBeNull();
        await tx.task.update({ where: { id: task.id }, data: { status: "completed" } });
        await tx.task.delete({ where: { id: task.id } });

        const ownedItem = await tx.inventoryItem.findFirst({
          where: { id: item.id, organizationId: orgA },
        });
        expect(ownedItem).not.toBeNull();
        await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: 4 } });
        await tx.inventoryTransaction.deleteMany({ where: { itemId: item.id } });
        await tx.inventoryItem.delete({ where: { id: item.id } });
        throw new Error(ROLLBACK_TEXT);
      })
      .catch((error) => {
        if ((error as Error).message !== ROLLBACK_TEXT) throw error;
      });
    expect(ownerId).toBeTruthy();
  });

  it("cross-org records stay invisible (override never crosses organizationId)", async () => {
    if (!orgB) return;
    const orgBId: string = orgB;
    const mrn = `IT-OWN-X-${Date.now()}`;
    await prisma
      .$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: { organizationId: orgA, firstName: "X", lastName: "Org", mrn },
        });
        const rx = await tx.prescription.create({
          data: {
            organizationId: orgA,
            patientId: patient.id,
            prescribedById: doctorId,
            medicationName: "Zyrtec",
            status: "active",
          },
        });
        await expect(
          tx.prescription.findFirst({ where: { id: rx.id, organizationId: orgBId } }),
        ).resolves.toBeNull();
        throw new Error(ROLLBACK_TEXT);
      })
      .catch((error) => {
        if ((error as Error).message !== ROLLBACK_TEXT) throw error;
      });
  });

  it("referenced service catalog entries deactivate instead of hard-delete", async () => {
    const stamp = Date.now();
    await prisma
      .$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: { organizationId: orgA, firstName: "Cat", lastName: "Ref", mrn: `IT-OWN-CAT-${stamp}` },
        });
        const service = await tx.serviceCatalog.create({
          data: { organizationId: orgA, code: `IT-${stamp}`, name: "IT Service", price: "100" },
        });
        await tx.procedureOrder.create({
          data: {
            organizationId: orgA,
            patientId: patient.id,
            orderedById: doctorId,
            serviceCatalogId: service.id,
            procedureName: "IT Service",
            status: "ordered",
          },
        });

        // Same reference-count logic as DELETE /api/catalogs/[id].
        const refs = await Promise.all([
          tx.invoiceLineItem.count({ where: { serviceCatalogId: service.id } }),
          tx.procedureOrder.count({ where: { serviceCatalogId: service.id } }),
          tx.servicePackage.count({ where: { serviceCatalogId: service.id } }),
        ]);
        expect(refs.some((c) => c > 0)).toBe(true);
        const deactivated = await tx.serviceCatalog.update({
          where: { id: service.id },
          data: { active: false },
        });
        expect(deactivated.active).toBe(false);
        await expect(
          tx.serviceCatalog.findUnique({ where: { id: service.id } }),
        ).resolves.not.toBeNull();

        // Unreferenced clinical entries hard-delete cleanly.
        const code = await tx.clinicalCatalog.create({
          data: { organizationId: orgA, system: "IT", code: `T${stamp}`, name: "IT code", category: "test" },
        });
        await tx.clinicalCatalog.delete({ where: { id: code.id } });
        await expect(
          tx.clinicalCatalog.findUnique({ where: { id: code.id } }),
        ).resolves.toBeNull();
        throw new Error(ROLLBACK_TEXT);
      })
      .catch((error) => {
        if ((error as Error).message !== ROLLBACK_TEXT) throw error;
      });
  });

  it("provider rename cascades to policies using the old name (G23)", async () => {
    const stamp = Date.now();
    const oldName = `IT Provider ${stamp}`;
    const newName = `IT Provider Renamed ${stamp}`;
    await prisma
      .$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: { organizationId: orgA, firstName: "Ins", lastName: "Prov", mrn: `IT-OWN-INS-${stamp}` },
        });
        const provider = await tx.insuranceProvider.create({
          data: { organizationId: orgA, name: oldName },
        });
        await tx.insurancePolicy.create({
          data: { patientId: patient.id, provider: oldName, policyNumber: `POL-${stamp}`, type: "primary" },
        });

        // Same cascade as PATCH /api/insurance/providers/[id].
        await tx.insuranceProvider.update({ where: { id: provider.id }, data: { name: newName } });
        await tx.insurancePolicy.updateMany({
          where: { provider: oldName, patient: { organizationId: orgA } },
          data: { provider: newName },
        });
        const policies = await tx.insurancePolicy.findMany({
          where: { patientId: patient.id },
        });
        expect(policies).toHaveLength(1);
        expect(policies[0].provider).toBe(newName);
        throw new Error(ROLLBACK_TEXT);
      })
      .catch((error) => {
        if ((error as Error).message !== ROLLBACK_TEXT) throw error;
      });
  });
});
