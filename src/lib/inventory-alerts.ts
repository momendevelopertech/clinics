/**
 * Server-side inventory alert categorization (pure — the cron route and the
 * GET alerts endpoint share this so UI banners and digests never disagree).
 */

export interface AlertableItem {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number | null;
  expiryDate: Date | string | null;
  batchNumber?: string | null;
}

export interface InventoryAlertSummary {
  expired: AlertableItem[];
  expiringSoon: AlertableItem[];
  lowStock: AlertableItem[];
}

export const EXPIRING_SOON_DAYS = 30;

export function categorizeInventoryAlerts(
  items: AlertableItem[],
  now: Date = new Date(),
  expiringDays: number = EXPIRING_SOON_DAYS,
): InventoryAlertSummary {
  const expired: AlertableItem[] = [];
  const expiringSoon: AlertableItem[] = [];
  const lowStock: AlertableItem[] = [];
  const soonLimit = now.getTime() + expiringDays * 24 * 60 * 60 * 1000;

  for (const item of items) {
    if (item.reorderLevel != null && item.quantity <= item.reorderLevel) {
      lowStock.push(item);
    }
    if (!item.expiryDate) continue;
    const exp = new Date(item.expiryDate).getTime();
    if (!Number.isFinite(exp)) continue;
    if (exp < now.getTime()) expired.push(item);
    else if (exp <= soonLimit) expiringSoon.push(item);
  }
  return { expired, expiringSoon, lowStock };
}
