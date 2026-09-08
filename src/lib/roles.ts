import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "./prisma";
import { requireOrgContext } from "./org";

export type SessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    organizationId?: string;
    roles?: string[];
  } | null;
};

export function hasRoleName(
  session: SessionLike,
  roleName:
    | "Super Admin"
    | "Owner"
    | "Doctor"
    | "Nurse"
    | "Care Coordinator"
    | "Receptionist"
    | "Biller"
    | "Pharmacist",
): boolean {
  return session?.user?.roles?.includes(roleName) ?? false;
}

export function isSuperAdmin(session: SessionLike): boolean {
  return hasRoleName(session, "Super Admin");
}

/**
 * Owners are users explicitly flagged with User.role === "owner"
 * (denormalized for self-serve signups) OR members of an "Owner"/
 * "Super Admin" RBAC role.
 */
export async function isOwner(): Promise<boolean> {
  const { userId, roles } = await requireOrgContext();

  if (roles.includes("Owner") || roles.includes("Super Admin")) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "owner";
}

export type OwnerGuard =
  | { ok: true; response: null }
  | { ok: false; response: NextResponse | null; redirect: string | null };

export async function requireOwner(opts?: {
  json?: boolean;
  redirectUrl?: string;
}): Promise<OwnerGuard> {
  const isOwnerFlag = await isOwner();

  if (isOwnerFlag) {
    return { ok: true, response: null };
  }

  if (opts?.json) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      redirect: null,
    };
  }

  return { ok: false, response: null, redirect: opts?.redirectUrl ?? "/" };
}

export type PlatformGuard =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof import("@/auth").auth>>>; userId: string }
  | { ok: false; error: { error: string } | null; status: number };

/**
 * Requires an RBAC "Super Admin" role AND the denormalized
 * superAdmin flag (only platform-created accounts have both).
 * Prevents a tenant from granting itself platform access.
 */
export async function requireSuperAdmin(): Promise<PlatformGuard> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return { ok: false, error: { error: "Authentication required" }, status: 401 };
  }

  if (!hasRoleName(session, "Super Admin")) {
    return { ok: false, error: { error: "Forbidden" }, status: 403 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, active: true },
  });

  if (!user || user.role !== "superAdmin" || !user.active) {
    return { ok: false, error: { error: "Forbidden" }, status: 403 };
  }

  return { ok: true, session, userId: session.user.id };
}