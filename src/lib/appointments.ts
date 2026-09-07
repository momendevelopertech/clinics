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