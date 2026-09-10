import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createIntegrationClient, loadIntegrationDatabaseUrl } from "./db";

// P3 integration suite (runs against the dev database, leaves zero residue):
// - Test A is read-only (tenant isolation on real rows).
// - Test B writes inside an interactive transaction that always rolls back.
// The suite self-skips when no database URL is available (e.g. CI without DB).

const dbUrl = loadIntegrationDatabaseUrl();
const describeDb = dbUrl ? describe : describe.skip;

let prisma: PrismaClient;

beforeAll(() => {
  prisma = createIntegrationClient(dbUrl);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describeDb("tenant isolation (integration)", () => {
  let orgA: string | null = null;
  let orgB: string | null = null;

  beforeAll(async () => {
    const first = await prisma.patient.findFirst({
      select: { organizationId: true },
    });
    if (!first) {
      throw new Error(
        "Integration DB must be seeded (npm run db:seed): need two organizations with patients.",
      );
    }
    orgA = first.organizationId;
    const second = await prisma.patient.findFirst({
      where: { organizationId: { not: orgA } },
      select: { organizationId: true },
    });
    orgB = second?.organizationId ?? null;
    if (!orgB) {
      throw new Error(
        "Integration DB must be seeded (npm run db:seed): need two organizations with patients.",
      );
    }
  });

  it("org-scoped patient queries never leak sibling-tenant rows", async () => {
    const [aPatients, bIds] = await Promise.all([
      prisma.patient.findMany({
        where: { organizationId: orgA! },
        select: { id: true, organizationId: true },
      }),
      prisma.patient
        .findMany({ where: { organizationId: orgB! }, select: { id: true } })
        .then((rows) => new Set(rows.map((r) => r.id))),
    ]);
    expect(aPatients.length).toBeGreaterThan(0);
    for (const p of aPatients) {
      expect(p.organizationId).toBe(orgA);
      expect(bIds.has(p.id)).toBe(false);
    }
  });

  it("enforces per-org MRN uniqueness and rolls everything back", async () => {
    const probeMrn = `IT-PROBE-${Date.now()}`;
    // The duplicate insert raises P2002, which aborts the whole transaction —
    // the violation itself is the rollback trigger, so nothing persists.
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.patient.create({
          data: { organizationId: orgA!, firstName: "It", lastName: "Probe", mrn: probeMrn },
        });
        // Same MRN, different org → allowed (the P0 fix).
        const sibling = await tx.patient.create({
          data: { organizationId: orgB!, firstName: "It", lastName: "Sibling", mrn: probeMrn },
        });
        expect(sibling.mrn).toBe(probeMrn);
        // Same MRN, same org → must violate Patient_organizationId_mrn_key.
        await tx.patient.create({
          data: { organizationId: orgA!, firstName: "It", lastName: "Dupe", mrn: probeMrn },
        });
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    // Nothing persisted.
    await expect(
      prisma.patient.findMany({ where: { mrn: probeMrn } }),
    ).resolves.toEqual([]);
  });

  it("denies permissions for unknown users and cross-tenant checks", async () => {
    // @/lib/auth binds @/lib/prisma at import time, which the unit setup
    // disables — load it here with a live DATABASE_URL instead.
    delete process.env.SKIP_DB_INIT;
    process.env.DATABASE_URL = dbUrl;
    const { hasPermission } = await import("@/lib/auth");

    // Unknown user → fail closed.
    await expect(hasPermission("no-such-user", orgA!, "patients:read", "patients")).resolves.toBe(
      false,
    );

    // Real user of orgA checked against orgB → tenant isolated.
    const staff = await prisma.user.findFirst({
      where: { organizationId: orgA! },
      select: { id: true },
    });
    expect(staff, "seeded staff in orgA").toBeTruthy();
    await expect(
      hasPermission(staff!.id, orgB!, "patients:read", "patients"),
    ).resolves.toBe(false);
    // Neon cold starts + next-auth import chain can exceed the 5s default.
  }, 60000);
});
