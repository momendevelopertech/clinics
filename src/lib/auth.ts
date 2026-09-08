import { prisma } from "./prisma";
import { requireOrgContext } from "./org";

export type RoleName =
  | "Super Admin"
  | "Owner"
  | "Doctor"
  | "Nurse"
  | "Care Coordinator"
  | "Receptionist"
  | "Patient"
  | "Biller"
  | "Pharmacist";

/**
 * Get current user ID from session.
 */
export async function getCurrentUserId(orgId?: string): Promise<string> {
  void orgId;
  const { userId } = await requireOrgContext();
  return userId;
}

export async function hasPermission(
  userId: string,
  orgId: string,
  action: string,
  resource?: string,
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: orgId },
    include: {
      userRoles: {
        include: {
          role: {
            include: { permissions: true },
          },
        },
      },
    },
  });

  if (!user) {
    return false;
  }

  if (
    user.userRoles.some(
      (entry: { role: { name: string } }) => entry.role.name === "Super Admin",
    )
  ) {
    return true;
  }

  return user.userRoles.some(
    (entry: { role: { permissions: { action: string; resource: string | null }[] } }) =>
      entry.role.permissions.some(
        (permission: { action: string; resource: string | null }) =>
          permission.action === action &&
          (resource
            ? permission.resource === resource || permission.resource === null
            : true),
      ),
  );
}

export async function hasAnyPermission(
  userId: string,
  orgId: string,
  permissions: Array<{ action: string; resource?: string }>,
) {
  for (const permission of permissions) {
    const allowed = await hasPermission(
      userId,
      orgId,
      permission.action,
      permission.resource,
    );

    if (allowed) {
      return true;
    }
  }

  return false;
}
