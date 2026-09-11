import { createHash } from "node:crypto";

/** Org tables included in a JSON backup snapshot (capped per table). */
export const EXPORT_TABLES = [
  "patient",
  "appointment",
  "encounter",
  "encounterNote",
  "vital",
  "prescription",
  "diagnosis",
  "followUp",
  "labOrder",
  "labResult",
  "procedureOrder",
  "invoice",
  "payment",
  "document",
  "consent",
  "task",
] as const;

/** Org scoping per table (three tables have no organizationId column). */
function scopeWhere(table: (typeof EXPORT_TABLES)[number], organizationId: string) {
  if (table === "encounterNote") return { encounter: { organizationId } };
  if (table === "vital") return { patient: { organizationId } };
  if (table === "payment") return { invoice: { organizationId } };
  return { organizationId };
}

export const EXPORT_ROW_LIMIT = 5000;

type LooseClient = Record<
  string,
  {
    findMany: (args: { where: Record<string, unknown>; take: number }) => Promise<unknown[]>;
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  }
>;

export interface OrgSnapshot {
  version: 1;
  exportedAt: string;
  organizationId: string;
  counts: Record<string, number>;
  truncated: Record<string, boolean>;
  tables: Record<string, unknown[]>;
  sha256: string;
}

function checksum(payload: Omit<OrgSnapshot, "sha256">): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Builds a portable JSON snapshot of one organization's data. All queries are
 * org-scoped; every table is capped (truncation flagged per table). Binary
 * blobs are never embedded — documents travel as metadata (storageKey URLs).
 */
export async function buildOrgSnapshot(
  db: { [K in (typeof EXPORT_TABLES)[number]]: LooseClient[string] },
  organizationId: string,
): Promise<OrgSnapshot> {
  const counts: Record<string, number> = {};
  const truncated: Record<string, boolean> = {};
  const tables: Record<string, unknown[]> = {};
  for (const table of EXPORT_TABLES) {
    const where = scopeWhere(table, organizationId);
    const [rows, total] = await Promise.all([
      db[table].findMany({ where, take: EXPORT_ROW_LIMIT }),
      db[table].count({ where }),
    ]);
    tables[table] = rows;
    counts[table] = total;
    truncated[table] = total > rows.length;
  }
  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    organizationId,
    counts,
    truncated,
    tables,
  };
  return { ...payload, sha256: checksum(payload) };
}

export function verifySnapshotChecksum(snapshot: OrgSnapshot): boolean {
  const { sha256, ...payload } = snapshot;
  return checksum(payload) === sha256;
}
