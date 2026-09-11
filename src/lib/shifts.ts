/** Rota overlap detection (pure). Two shifts collide when they share the
 * same user + weekday and their [start, end) windows intersect. */

export interface ShiftWindow {
  userId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export function shiftsOverlap(a: ShiftWindow, b: ShiftWindow): boolean {
  if (a.userId !== b.userId || a.weekday !== b.weekday) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function findShiftConflict(
  existing: ShiftWindow[],
  candidate: ShiftWindow,
): ShiftWindow | null {
  return existing.find((s) => shiftsOverlap(s, candidate)) ?? null;
}

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
