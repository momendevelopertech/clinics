/** Monthly report CSV/XLSX export + schedule-due math (pure). */

export interface MonthlySummary {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
  revenue: number;
  expenses?: number;
  net?: number;
  outstanding: number;
}

export interface ServiceRow {
  name: string;
  count: number;
  revenue: number;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildMonthlyCsv(
  month: string,
  summary: MonthlySummary,
  perService: ServiceRow[],
): string {
  const lines: Array<Array<string | number>> = [
    ["Month", month],
    ["Total appointments", summary.totalAppointments],
    ["Completed", summary.completed],
    ["Cancelled", summary.cancelled],
    ["No-shows", summary.noShow],
    ["Completion rate %", summary.completionRate],
    ["Revenue collected", summary.revenue],
    ["Outstanding added", summary.outstanding],
    ["Expenses", summary.expenses ?? 0],
    ["Net profit", summary.net ?? 0],
    [],
    ["Service", "Quantity", "Revenue"],
    ...perService.map((s) => [s.name, s.count, s.revenue]),
  ];
  return lines.map((row) => row.map(csvCell).join(",")).join("\n");
}

export interface ReportScheduleLike {
  frequency: string;
  dayOfMonth: number;
  lastSentAt: Date | string | null;
  active: boolean;
}

/** Monthly schedule fires once the month's day arrives and nothing was sent this month. */
export function isScheduleDue(schedule: ReportScheduleLike, now: Date = new Date()): boolean {
  if (!schedule.active || schedule.frequency !== "monthly") return false;
  const day = Math.min(Math.max(schedule.dayOfMonth, 1), 28);
  if (now.getDate() < day) return false;
  if (!schedule.lastSentAt) return true;
  const sent = new Date(schedule.lastSentAt);
  return sent.getFullYear() !== now.getFullYear() || sent.getMonth() !== now.getMonth();
}
