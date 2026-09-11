/** Session-package balance math (pure). */

export function sessionsRemaining(total: number, used: number): number {
  return Math.max(0, total - used);
}

export function canConsumeSession(args: {
  status: string;
  sessionsTotal: number;
  sessionsUsed: number;
}): boolean {
  if (args.status !== "active") return false;
  return sessionsRemaining(args.sessionsTotal, args.sessionsUsed) > 0;
}

/** Status after consuming one more session. */
export function statusAfterConsume(total: number, usedAfter: number): "active" | "completed" {
  return sessionsRemaining(total, usedAfter) === 0 ? "completed" : "active";
}
