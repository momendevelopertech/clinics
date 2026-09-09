export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeSize = Math.max(1, Math.floor(Number(pageSize) || 1));
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeSize = Math.max(1, Math.floor(Number(pageSize) || 1));
  const pageCount = Math.max(1, Math.ceil(total / safeSize));
  return Math.min(safePage, pageCount);
}