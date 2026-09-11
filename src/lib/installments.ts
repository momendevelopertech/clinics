/**
 * Installment schedules + coupon math (pure functions — pence-safe: all
 * splitting happens in integer cents, the remainder goes to the last due).
 */

export type InstallmentFrequency = "weekly" | "monthly";

export interface ScheduledInstallment {
  dueDate: Date;
  amount: number;
}

export function buildInstallmentSchedule(args: {
  total: number;
  count: number;
  firstDueDate: Date;
  frequency: InstallmentFrequency;
}): ScheduledInstallment[] {
  const { total, count, firstDueDate, frequency } = args;
  if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid total");
  if (!Number.isInteger(count) || count < 2 || count > 24) throw new Error("Invalid count");
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const out: ScheduledInstallment[] = [];
  for (let i = 0; i < count; i += 1) {
    const cents = i === count - 1 ? totalCents - base * (count - 1) : base;
    const due = new Date(firstDueDate);
    if (frequency === "weekly") due.setDate(due.getDate() + i * 7);
    else due.setMonth(due.getMonth() + i);
    out.push({ dueDate: due, amount: cents / 100 });
  }
  return out;
}

export interface CouponLike {
  kind: string;
  value: number;
  active: boolean;
  expiresAt: Date | null;
}

/** Order-level discount for a subtotal. Capped at the subtotal, never negative. */
export function applyCouponDiscount(subtotal: number, coupon: CouponLike): number {
  if (!coupon.active) return 0;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return 0;
  if (coupon.kind === "percent") {
    if (!Number.isFinite(coupon.value) || coupon.value <= 0) return 0;
    return Math.min(subtotal, Math.round(subtotal * (Math.min(coupon.value, 100) / 100) * 100) / 100);
  }
  if (coupon.kind === "fixed") {
    if (!Number.isFinite(coupon.value) || coupon.value <= 0) return 0;
    return Math.min(subtotal, coupon.value);
  }
  return 0;
}
