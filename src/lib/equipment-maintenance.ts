export type EquipmentCalibrationAlertStatus = "ok" | "warning" | "overdue";

export function getEquipmentCalibrationAlertStatus(
  equipment: {
    nextCalibrationAt?: Date | string | null;
    status?: string | null;
  },
  now: Date = new Date(),
): EquipmentCalibrationAlertStatus {
  if (equipment.status === "inactive") return "ok";

  const target = equipment.nextCalibrationAt ? new Date(equipment.nextCalibrationAt) : null;
  if (!target || Number.isNaN(target.getTime())) return "ok";

  const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 14) return "warning";
  return "ok";
}

export function getMaintenanceSummary(maintenances: Array<{ status?: string | null; dueAt?: Date | string | null }>) {
  const now = new Date();
  const overdue = maintenances.filter((item) => {
    const status = item.status ?? "scheduled";
    if (status === "overdue") return true;
    if (status === "completed") return false;
    return !!item.dueAt && new Date(item.dueAt) < now;
  }).length;
  const scheduled = maintenances.filter((item) => (item.status ?? "scheduled") === "scheduled").length;
  const completed = maintenances.filter((item) => (item.status ?? "scheduled") === "completed").length;

  return { overdue, scheduled, completed };
}
