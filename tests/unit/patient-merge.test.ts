import { describe, expect, it, vi } from "vitest";
import { mergePatientRecords } from "@/lib/patient-merge";

function fakeTx(opts?: { survivorHasContact?: boolean }) {
  const calls: Array<{ table: string; where: unknown; data?: unknown }> = [];
  const tx: Record<string, unknown> = {};
  const tables = [
    "appointment", "encounter", "prescription", "diagnosis", "followUp",
    "labResult", "labOrder", "procedureOrder", "invoice", "insuranceClaim",
    "consent", "document", "communication", "task", "waitlistEntry",
    "patientHistory", "vital", "insurancePolicy", "feedbackSurvey",
  ];
  for (const t of tables) {
    tx[t] = {
      updateMany: vi.fn(async (args: { where: unknown; data: unknown }) => {
        calls.push({ table: t, where: args.where, data: args.data });
        return { count: t === "appointment" ? 2 : 1 };
      }),
    };
  }
  tx.emergencyContact = {
    findFirst: vi.fn(async () =>
      opts?.survivorHasContact ? { id: "contact-survivor" } : null,
    ),
    updateMany: vi.fn(async (args: { where: unknown; data: unknown }) => {
      calls.push({ table: "emergencyContact", where: args.where, data: args.data });
      return { count: 1 };
    }),
    deleteMany: vi.fn(async (args: { where: unknown }) => {
      calls.push({ table: "emergencyContact-delete", where: args.where });
      return { count: 1 };
    }),
  };
  tx.patientSession = {
    deleteMany: vi.fn(async (args: { where: unknown }) => {
      calls.push({ table: "patientSession-delete", where: args.where });
      return { count: 2 };
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { tx: tx as any, calls };
}

describe("mergePatientRecords", () => {
  it("re-points every table from duplicate to survivor with tenant scope", async () => {
    const { tx, calls } = fakeTx();
    const result = await mergePatientRecords(tx, {
      duplicateId: "dup",
      survivorId: "keep",
      organizationId: "org1",
    });

    const scoped = calls.filter((c) => !c.table.endsWith("-delete"));
    // 16 scoped + 3 unscoped + 1 emergencyContact move
    expect(scoped.length).toBe(20);
    for (const c of calls.filter((c) => c.table !== "emergencyContact")) {
      expect(c.where).toMatchObject({ patientId: "dup" });
    }
    for (const c of calls.filter(
      (c) => !["vital", "insurancePolicy", "feedbackSurvey"].includes(c.table),
    )) {
      if (!c.table.endsWith("-delete") && c.table !== "emergencyContact") {
        expect(c.where).toMatchObject({ organizationId: "org1" });
      }
    }
    expect(result.moved.appointment).toBe(2);
    expect(result.emergencyContact).toBe("moved");
    expect(result.sessionsRevoked).toBe(2);
  });

  it("drops the duplicate emergency contact when the survivor has one", async () => {
    const { tx } = fakeTx({ survivorHasContact: true });
    const result = await mergePatientRecords(tx, {
      duplicateId: "dup",
      survivorId: "keep",
      organizationId: "org1",
    });
    expect(result.emergencyContact).toBe("dropped-duplicate");
  });

  it("refuses self-merge", async () => {
    const { tx } = fakeTx();
    await expect(
      mergePatientRecords(tx, { duplicateId: "x", survivorId: "x", organizationId: "org1" }),
    ).rejects.toThrow("itself");
  });
});
