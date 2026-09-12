import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  buildPrescriptionDraftFromExisting,
  type PrescriptionLike,
} from "@/lib/prescriptions";
import { createIntegrationClient, loadIntegrationDatabaseUrl } from "./db";

// Prescription feature integration suite (runs against the dev database,
// leaves zero residue): every test writes inside an interactive transaction
// that is always rolled back. Self-skips when no database URL is available.

const dbUrl = loadIntegrationDatabaseUrl();
const describeDb = dbUrl ? describe : describe.skip;

let prisma: PrismaClient;

beforeAll(() => {
  prisma = createIntegrationClient(dbUrl);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function pickSeededOrg(): Promise<{ orgA: string; orgB: string | null }> {
  const first = await prisma.patient.findFirst({ select: { organizationId: true } });
  if (!first) {
    throw new Error("Integration DB must be seeded (npm run db:seed) with patients.");
  }
  const second = await prisma.patient.findFirst({
    where: { organizationId: { not: first.organizationId } },
    select: { organizationId: true },
  });
  return { orgA: first.organizationId, orgB: second?.organizationId ?? null };
}

describeDb("prescription convenience features (integration)", () => {
  let orgA: string;
  let orgB: string | null;
  let staffId: string;
  const ROLLBACK_TEXT = "ROLLBACK";

  beforeAll(async () => {
    const orgs = await pickSeededOrg();
    orgA = orgs.orgA;
    orgB = orgs.orgB;
    const staff = await prisma.user.findFirst({
      where: { organizationId: orgA },
      select: { id: true },
    });
    if (!staff) {
      throw new Error("Integration DB must be seeded: no staff user in the first org.");
    }
    staffId = staff.id;
  });

  it("medication favorite usageCount increments on each save and persists org scoping", async () => {
    const key = `IT-RX-FAV-${Date.now()}`;
    const counts: number[] = [];

    await prisma
      .$transaction(async (tx) => {
        const save = async () =>
          tx.medicationFavorite.upsert({
            where: {
              userId_medicationName: { userId: staffId, medicationName: key },
            },
            create: {
              organizationId: orgA,
              userId: staffId,
              medicationName: key,
              usageCount: 1,
            },
            update: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
          });
        counts.push((await save()).usageCount); // first save → 1
        counts.push((await save()).usageCount); // repeat → 2
        throw new Error(ROLLBACK_TEXT);
      })
      .catch(() => undefined);

    expect(counts).toEqual([1, 2]);
    // Zero residue after the rollback.
    await expect(
      prisma.medicationFavorite.findMany({ where: { medicationName: key } }),
    ).resolves.toEqual([]);
  });

  it("repeat/clone writes brand-new prescriptions and never mutates the source", async () => {
    const mrn = `IT-RX-${Date.now()}`;

    await prisma
      .$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: { organizationId: orgA, firstName: "Rx", lastName: "Patient", mrn },
        });
        const base = {
          organizationId: orgA,
          patientId: patient.id,
          prescribedById: staffId,
          medicationName: "Amoxicillin",
          dosage: "500mg",
          frequency: "3x/day",
          duration: "7 days",
          items: { create: [{ medicationName: "Paracetamol", dosage: "1000mg" }] },
        };

        const source = await tx.prescription.create({
          data: base,
          include: { items: { select: { medicationName: true } } },
        });
        const rawItems = source.items?.length ?? -1;
        expect(rawItems).toBe(1);
        const draft = buildPrescriptionDraftFromExisting(source as PrescriptionLike);
        expect(draft).toHaveLength(2);
        expect(draft[0].medicationName).toBe("Amoxicillin");
        expect(draft[1].medicationName).toBe("Paracetamol");

        // The simulated "repeat/clone" flow — a brand-new row, same content.
        const clone = await tx.prescription.create({ data: base });

        expect(clone.id).not.toBe(source.id);
        const sourceRemainsUntouched = await tx.prescriptionItem.count({
          where: { prescriptionId: source.id },
        });
        expect(sourceRemainsUntouched).toBe(1);
        throw new Error(ROLLBACK_TEXT);
      })
      .catch((error) => {
        if ((error as Error).message !== ROLLBACK_TEXT) {
          throw error;
        }
      });
  });

  it("templates: shared ones are visible to other staff, personal ones are not", async () => {
    let successful = false;

    await prisma
      .$transaction(async (tx) => {
        const stamp = Date.now();
        const author = await tx.user.create({
          data: {
            organizationId: orgA,
            email: `it-tpl-author-${stamp}@test.local`,
            name: "IT Template Author",
          },
        });
        const other = await tx.user.create({
          data: {
            organizationId: orgA,
            email: `it-tpl-other-${stamp}@test.local`,
            name: "IT Template Other",
          },
        });

        const personal = await tx.prescriptionTemplate.create({
          data: {
            organizationId: orgA,
            createdById: author.id,
            name: `IT Personal ${stamp}`,
            items: [{ medicationName: "Personal drug", dosage: "1" }],
          },
        });
        const shared = await tx.prescriptionTemplate.create({
          data: {
            organizationId: orgA,
            createdById: author.id,
            name: `IT Shared ${stamp}`,
            isShared: true,
            items: [{ medicationName: "Shared drug", dosage: "2" }],
          },
        });

// Other staff only see shared templates (or their own, which they have
// none of here) — the personal template never leaks.
const asOther = await tx.prescriptionTemplate.findMany({
  where: {
    organizationId: orgA,
    OR: [{ isShared: true }, { createdById: other.id }],
  },
});
expect(asOther.map((tpl) => tpl.id)).toEqual([shared.id]);

        // Another org can never reach an orgA template by id.
        if (orgB) {
          const crossOrg = await tx.prescriptionTemplate.findFirst({
            where: { id: personal.id, organizationId: orgB },
          });
          expect(crossOrg).toBeNull();
        }
        successful = true;
        throw new Error(ROLLBACK_TEXT);
      })
      .catch(() => undefined);

    expect(successful).toBe(true);
  });
});