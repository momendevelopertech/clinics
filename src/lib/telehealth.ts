/** Telehealth visit helpers (pure). Video itself is provider-hosted
 * (Meet/Zoom link attached by staff); managed SFU rooms need vendor keys
 * and are tracked separately — this module never invents a meeting URL. */

export function isTelehealthAppointment(appointmentType?: string | null): boolean {
  return (appointmentType ?? "").trim().toLowerCase() === "telehealth";
}

/**
 * Show the Join button when: telehealth visit + link attached + visit is
 * live-ish (started within the last 2h or starting within 24h) + not
 * terminally closed.
 */
export function shouldShowJoinLink(args: {
  appointmentType?: string | null;
  telehealthUrl?: string | null;
  startTime: Date | string;
  status: string;
  now?: Date;
}): boolean {
  if (!isTelehealthAppointment(args.appointmentType)) return false;
  if (!args.telehealthUrl?.trim()) return false;
  if (["cancelled", "completed", "no_show"].includes(args.status)) return false;
  const now = args.now ?? new Date();
  const start = new Date(args.startTime).getTime();
  if (!Number.isFinite(start)) return false;
  const diffHours = (start - now.getTime()) / 3_600_000;
  return diffHours <= 24 && diffHours >= -2;
}
