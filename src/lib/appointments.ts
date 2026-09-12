import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { parseAvailableDays, parseOrgSettings } from "./org-settings";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function toDayKey(date: Date): string {
  return DAY_KEYS[date.getDay()];
}

export function toHM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function isWithinWindow(time: string, from: string, to: string): boolean {
  return time >= from && time <= to;
}

/**
 * A doctor is available at a given slot when:
 * - availabilityType is not "regular" (on-call / by-appointment are unrestricted), OR
 * - the day is in their availableDays AND the slot is inside their window.
 */
export function isDoctorAvailable(
  provider: Pick<
    User,
    "availabilityType" | "availableDays" | "availableFrom" | "availableTo"
  >,
  date: Date,
): { available: boolean; reason?: string } {
  if (!provider.availabilityType || provider.availabilityType !== "regular") {
    return { available: true };
  }

  const days = parseAvailableDays(provider.availableDays);
  const dayKey = toDayKey(date);

  if (days === null || !days.includes(dayKey)) {
    return { available: false };
  }

  const from = provider.availableFrom || "00:00";
  const to = provider.availableTo || "23:59";
  return { available: isWithinWindow(toHM(date), from, to) };
}

const ACTIVE_STATUSES = ["scheduled", "confirmed", "arrived", "in_progress"];

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  scheduled: ["scheduled", "confirmed", "arrived", "cancelled", "no_show"],
  confirmed: ["confirmed", "arrived", "cancelled", "no_show"],
  arrived: ["arrived", "in_progress", "cancelled", "no_show"],
  in_progress: ["in_progress", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
  no_show: ["no_show"],
};

export function isAppointmentTransitionAllowed(current: string, next: string): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

/** Reception check-in: only scheduled/confirmed visits can be marked arrived. */
export function canCheckInAppointment(status: string): boolean {
  return status === "scheduled" || status === "confirmed";
}

/** Reception check-out: an in-progress visit is the one leaving the room. */
export function canCheckOutAppointment(status: string): boolean {
  return status === "in_progress";
}

/** Reception no-show: a patient who never showed for a booked visit. */
export function canMarkAppointmentNoShow(status: string): boolean {
  return status === "scheduled" || status === "confirmed" || status === "arrived";
}

type AppointmentDb = {
  appointment: Pick<typeof prisma.appointment, "findFirst" | "count">;
};

/**
 * Transactional overlap guard. Runs INSIDE the caller's $transaction so a
 * simultaneous booking for the same provider + slot cannot win the race.
 * (Backstopped by the partial unique index `appointment_active_slot_unique`.)
 */
export async function hasAppointmentConflict(
  db: AppointmentDb,
  providerId: string,
  start: Date,
  end: Date,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const overlapping = await db.appointment.findFirst({
    where: {
      providerId,
      status: { in: ACTIVE_STATUSES },
      startTime: { lt: end },
      endTime: { gt: start },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true },
  });

  return Boolean(overlapping);
}

/**
 * Generates the next walk-in token for a given day, e.g. "T-01", "T-02".
 */
export async function nextWalkInToken(
  db: AppointmentDb,
  organizationId: string,
  date: Date,
): Promise<string> {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(
    dayStart.getFullYear(),
    dayStart.getMonth(),
    dayStart.getDate() + 1,
  );

  const count = await db.appointment.count({
    where: {
      organizationId,
      isWalkIn: true,
      startTime: { gte: dayStart, lt: dayEnd },
    },
  });

  return `T-${String(count + 1).padStart(2, "0")}`;
}

export function appointmentDurationForOrg(organizationId: string) {
  return async () => {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settingsJson: true },
    });
    return parseOrgSettings(org?.settingsJson).appointmentDurationMins ?? 30;
  };
}

/**
 * New vs returning split for a period: a patient is new when their first
 * recorded visit falls inside the period. Pure and unit-tested.
 */
export function splitNewVsReturning(
  firstVisits: Array<{ patientId: string; firstStart: Date }>,
  periodStart: Date,
): { newPatients: number; returningPatients: number } {
  let newPatients = 0;
  let returningPatients = 0;
  for (const v of firstVisits) {
    if (v.firstStart >= periodStart) newPatients += 1;
    else returningPatients += 1;
  }
  return { newPatients, returningPatients };
}

export type DaySlot = {
  start: Date;
  end: Date;
};

/**
 * No-show / late-cancellation policy tracking (P4).
 * A cancellation is "late" when it happens inside the org's
 * lateCancelHoursBefore window; a patient is flagged when no-shows
 * reach maxNoShows. Pure and unit-tested.
 */
export type CancellationPolicy = {
  lateCancelHoursBefore: number;
  maxNoShows: number;
  noShowFee: number;
};

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  lateCancelHoursBefore: 24,
  maxNoShows: 3,
  noShowFee: 0,
};

export function isLateCancellation(
  cancelledAt: Date,
  startTime: Date,
  lateCancelHoursBefore: number,
): boolean {
  const hoursBefore = (startTime.getTime() - cancelledAt.getTime()) / 3_600_000;
  return hoursBefore >= 0 && hoursBefore < lateCancelHoursBefore;
}

export type AttendanceSummary = {
  total: number;
  completed: number;
  cancelled: number;
  lateCancels: number;
  noShows: number;
  flagged: boolean;
};

export function summarizeAttendance(
  appointments: Array<{ status: string; startTime: Date; updatedAt: Date }>,
  policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY,
  now: Date = new Date(),
): AttendanceSummary {
  let completed = 0;
  let cancelled = 0;
  let lateCancels = 0;
  let noShows = 0;
  for (const a of appointments) {
    if (a.startTime > now) continue;
    if (a.status === "completed") completed += 1;
    else if (a.status === "cancelled") {
      cancelled += 1;
      if (isLateCancellation(a.updatedAt, a.startTime, policy.lateCancelHoursBefore)) {
        lateCancels += 1;
      }
    } else if (a.status === "no_show") noShows += 1;
  }
  return {
    total: completed + cancelled + noShows,
    completed,
    cancelled,
    lateCancels,
    noShows,
    flagged: noShows >= policy.maxNoShows,
  };
}

/**
 * Patient self-service guards (portal cancel/reschedule). Pure and tested:
 * only the patient's own upcoming scheduled/confirmed visits can change,
 * and only while the visit is still in the future.
 */
export function canPatientCancelAppointment(
  appointment: { patientId: string; status: string; startTime: Date },
  patientId: string,
  now: Date = new Date(),
): boolean {
  if (appointment.patientId !== patientId) return false;
  if (appointment.startTime <= now) return false;
  if (!["scheduled", "confirmed", "arrived", "in_progress"].includes(appointment.status)) {
    return false;
  }
  return isAppointmentTransitionAllowed(appointment.status, "cancelled");
}

export function canPatientRescheduleAppointment(
  appointment: { patientId: string; status: string; startTime: Date },
  patientId: string,
  now: Date = new Date(),
): boolean {
  if (appointment.patientId !== patientId) return false;
  if (appointment.startTime <= now) return false;
  return appointment.status === "scheduled" || appointment.status === "confirmed";
}

/**
 * Availability grid for one provider + day. Slots tile the provider's
 * working window (or openTime–closeTime fallback) in `durationMins` steps;
 * past slots and ones overlapping existing active appointments are removed.
 * Pure and unit-tested — the engine behind public self-booking.
 */
export function getAvailableSlots(params: {
  provider: Pick<
    User,
    "availabilityType" | "availableDays" | "availableFrom" | "availableTo"
  >;
  date: Date;
  durationMins: number;
  existingAppointments: Array<{ startTime: Date; endTime: Date }>;
  now?: Date;
  openTime?: string;
  closeTime?: string;
}): DaySlot[] {
  const { provider, date, durationMins, existingAppointments } = params;
  const now = params.now ?? new Date();
  if (!Number.isFinite(durationMins) || durationMins <= 0) return [];

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const from =
    provider.availabilityType === "regular"
      ? (provider.availableFrom ?? params.openTime ?? "09:00")
      : (params.openTime ?? "09:00");
  const to =
    provider.availabilityType === "regular"
      ? (provider.availableTo ?? params.closeTime ?? "17:00")
      : (params.closeTime ?? "17:00");

  const [fromH, fromM] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);
  if (
    ![fromH, fromM, toH, toM].every((n) => Number.isInteger(n)) ||
    fromH > 23 ||
    toH > 23
  ) {
    return [];
  }

  const windowStart = new Date(dayStart);
  windowStart.setHours(fromH, fromM, 0, 0);
  const windowEnd = new Date(dayStart);
  windowEnd.setHours(toH, toM, 0, 0);
  if (windowEnd <= windowStart) return [];

  const slots: DaySlot[] = [];
  for (
    let cursor = new Date(windowStart);
    new Date(cursor.getTime() + durationMins * 60000) <= windowEnd;
    cursor = new Date(cursor.getTime() + durationMins * 60000)
  ) {
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + durationMins * 60000);
    if (end <= now) continue;
    if (!isDoctorAvailable(provider, start).available) continue;
    const overlaps = existingAppointments.some(
      (a) => a.startTime < end && a.endTime > start,
    );
    if (overlaps) continue;
    slots.push({ start, end });
  }
  return slots;
}