export function percentage(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function averageMinutes(durationsMs: number[]): number {
  if (durationsMs.length === 0) return 0;
  return Math.round(
    durationsMs.reduce((total, duration) => total + duration, 0) /
      durationsMs.length /
      60000,
  );
}

/** Net profit = collected revenue − recorded expenses (cent-safe). */
export function netProfit(revenue: number, expenses: number): number {
  return Math.round((revenue - expenses) * 100) / 100;
}

