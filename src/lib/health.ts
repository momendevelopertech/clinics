export type ReadinessCheck = "ok" | "fail";

export type ReadinessReport = {
  status: "ready" | "not_ready";
  checks: {
    database: ReadinessCheck;
  };
};

export async function evaluateReadiness(
  pingDatabase: () => Promise<unknown>,
): Promise<ReadinessReport> {
  try {
    await pingDatabase();
    return { status: "ready", checks: { database: "ok" } };
  } catch {
    return { status: "not_ready", checks: { database: "fail" } };
  }
}

export function livenessPayload() {
  return { status: "ok" as const };
}
