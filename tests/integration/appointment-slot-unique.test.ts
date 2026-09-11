import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createIntegrationClient, loadIntegrationDatabaseUrl } from "./db";

// Task 0 (TASKS_FEATURES.md): proves the double-booking backstop lives at the
// DATABASE level (partial unique index `appointment_active_slot_unique`), not
// just in application logic (`hasAppointmentConflict`).
// Self-skips when no database URL is available. Leaves zero residue: every
// probe row it creates is deleted in a finally block.

const dbUrl = loadIntegrationDatabaseUrl();
const describeDb = dbUrl ? describe : describe.skip;

let prisma: PrismaClient;

beforeAll(() => {
  prisma = createIntegrationClient(dbUrl);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describeDb("appointment slot unique backstop (integration)", () => {
  it("partial unique index exists on active (providerId, startTime)", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE indexname = 'appointment_active_slot_unique'
    `;
    expect(
      rows.map((r) => r.indexname),
      "run `npx prisma migrate deploy` to apply 20260911120000_restore_appointment_slot_unique",
    ).toContain("appointment_active_slot_unique");
  });

  it("rejects a second active booking for the same provider+slot at DB level", async () => {
    const org = await prisma.patient.findFirst({
      select: { organizationId: true },
    });
    expect(org, "seeded patient required").toBeTruthy();
    const organizationId = org!.organizationId;

    const provider = await prisma.user.findFirst({
      where: { organizationId },
      select: { id: true },
    });
    expect(provider, "seeded staff provider required").toBeTruthy();

    const patients = await prisma.patient.findMany({
      where: { organizationId },
      select: { id: true },
      take: 2,
    });
    expect(patients.length, "two seeded patients required").toBeGreaterThanOrEqual(2);

    // Far-future slot with truncated seconds avoids colliding with seed data.
    const start = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const tag = `IT-SLOT-${Date.now()}`;
    const createdIds: string[] = [];

    try {
      // Two "simultaneous" bookings: same provider, same startTime, both active.
      // Postgres serializes them; exactly one must die with 23505 (P2002) —
      // no application code is involved in this path (raw prisma.create).
      const results = await Promise.allSettled([
        prisma.appointment.create({
          data: {
            organizationId,
            providerId: provider!.id,
            patientId: patients[0].id,
            startTime: start,
            endTime: end,
            status: "scheduled",
            idempotencyKey: `${tag}-A`,
          },
          select: { id: true },
        }),
        prisma.appointment.create({
          data: {
            organizationId,
            providerId: provider!.id,
            patientId: patients[1].id,
            startTime: start,
            endTime: end,
            status: "confirmed",
            idempotencyKey: `${tag}-B`,
          },
          select: { id: true },
        }),
      ]);

      const won = results.filter((r) => r.status === "fulfilled");
      const lost = results.filter((r) => r.status === "rejected");
      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(1);
      // Prisma maps Postgres unique violation 23505 to P2002.
      expect((lost[0] as PromiseRejectedResult).reason).toMatchObject({
        code: "P2002",
      });
      for (const r of won) {
        createdIds.push((r as PromiseFulfilledResult<{ id: string }>).value.id);
      }
    } finally {
      await prisma.appointment.deleteMany({
        where: { idempotencyKey: { startsWith: tag } },
      });
    }
    expect(createdIds).toHaveLength(1);
  }, 60000);
});
