/**
 * Appointment-reminder cadence math (pure). The hourly cron evaluates two
 * cadences: a 24h heads-up and a 1h last-call. Each cadence carries its own
 * dedupe tag so enabling the 1h reminder later never re-fires the 24h one.
 */

export type ReminderCadence = "24h" | "1h";

/** [minHours, maxHours] before startTime in which a cadence fires. */
export const CADENCE_WINDOWS: Record<ReminderCadence, readonly [number, number]> = {
  "24h": [23, 25],
  "1h": [50 / 60, 70 / 60],
};

export function isCadenceDue(startTime: Date, now: Date, cadence: ReminderCadence): boolean {
  const hoursLeft = (startTime.getTime() - now.getTime()) / 3_600_000;
  const [min, max] = CADENCE_WINDOWS[cadence];
  return hoursLeft >= min && hoursLeft <= max;
}

export function reminderTag(appointmentId: string, cadence: ReminderCadence): string {
  return `[APPOINTMENT_ID: ${appointmentId}][CADENCE: ${cadence}]`;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Quiet hours (org-local "HH:MM" wall clock, overnight ranges wrap, e.g.
 * 22:00→07:00). Invalid/missing bounds mean "no quiet hours".
 */
export function isQuietHour(now: Date, start?: string | null, end?: string | null): boolean {
  if (!start || !end || !TIME_RE.test(start) || !TIME_RE.test(end)) return false;
  if (start === end) return false;
  const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

export interface ReminderChannelConfig {
  sms?: boolean;
  whatsapp?: boolean;
  email?: boolean;
}

export type ReminderChannel = "sms" | "whatsapp" | "email";

export function enabledReminderChannels(config?: ReminderChannelConfig | null): ReminderChannel[] {
  const out: ReminderChannel[] = [];
  if (config?.sms !== false) out.push("sms");
  if (config?.whatsapp !== false) out.push("whatsapp");
  if (config?.email !== false) out.push("email");
  return out;
}
