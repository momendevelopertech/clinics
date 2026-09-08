import { requireAnyPermission } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const CLINIC_MODULES = [
  "dashboard",
  "patients",
  "appointments",
  "queue",
  "encounters",
  "analytics",
  "consents",
  "audit",
  "labs",
  "tasks",
  "documents",
  "reports",
  "availability",
  "catalogs",
  "communications",
  "locations",
  "waitlist",
  "billing",
  "payments",
  "inventory",
  "automation",
  "campaigns",
  "settings",
  "plan",
  "help",
] as const;

export type ClinicModule = (typeof CLINIC_MODULES)[number];

export const ROLE_MODULE_ACCESS: Record<string, readonly string[]> = {
  Owner: CLINIC_MODULES,
  Doctor: [
    "dashboard", "patients", "appointments", "queue", "encounters", "analytics",
    "consents", "audit", "labs", "tasks", "documents", "reports", "availability",
    "catalogs", "help",
  ],
  "Care Coordinator": [
    "dashboard", "patients", "appointments", "queue", "consents", "tasks",
    "documents", "communications", "locations", "waitlist", "help",
  ],
  Nurse: [
    "dashboard", "patients", "appointments", "encounters", "analytics", "consents",
    "labs", "inventory", "tasks", "documents", "reports", "availability", "catalogs",
    "help",
  ],
  Biller: [
    "dashboard", "patients", "appointments", "analytics", "audit", "billing",
    "payments", "tasks", "reports", "help",
  ],
  Pharmacist: [
    "dashboard", "patients", "appointments", "labs", "inventory", "tasks",
    "catalogs", "help",
  ],
};

export function modulePermission(module: ClinicModule | string, action = "read") {
  return { action: `${module}:${action}`, resource: module };
}

export async function requireModulePermission(
  organizationId: string,
  module: ClinicModule | string,
  action = "read",
) {
  const authz = await requireAnyPermission(organizationId, [
    modulePermission(module, action),
  ]);
  if (!authz.response || action !== "read") return authz;

  // New module permissions are seeded for new clinics. This role fallback also
  // keeps existing clinics correct without a schema/data migration.
  const user = await prisma.user.findFirst({
    where: { id: authz.userId, organizationId },
    select: {
      role: true,
      userRoles: { select: { role: { select: { name: true } } } },
    },
  });
  const allowed =
    user?.role === "owner" ||
    user?.role === "superAdmin" ||
    user?.userRoles.some(({ role }) =>
      (ROLE_MODULE_ACCESS[role.name] ?? []).includes(module),
    );
  return allowed ? { userId: authz.userId, response: null } : authz;
}
