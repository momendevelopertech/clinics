export function formatMoney(
  value: number | string | null | undefined,
  currency = "USD",
  locale?: string,
): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (value === null || value === undefined) return "—";
  if (typeof num !== "number" || !Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return "—";
  }
}
