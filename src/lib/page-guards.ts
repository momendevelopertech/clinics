import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * G13: server-side page guard for dashboard pages (defense in depth).
 * The edge proxy (`src/proxy.ts`) is the first gate; this is the second:
 * a server component calls it before rendering any client shell, so a
 * forbidden role never receives the page at all (no client-only flash).
 *
 * - No session/org -> /login
 * - Suspended org -> /suspended
 * - Super Admin -> /super (platform console only)
 * - Owner bypasses role checks (clinic owner sees everything)
 * - Otherwise the session's RBAC roles must intersect `roles`
 *   ("Care Coordinator" also satisfies "Receptionist").
 */
const DISPLAY_ALIASES: Record<string, string> = {
  "Care Coordinator": "Receptionist",
};

export async function requireClinicPage(opts: { roles?: string[] } = {}): Promise<{
  orgId: string;
  userId: string;
  roles: string[];
}> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.organizationId;
  if (!orgId) redirect("/login");

  const roles = session.user.roles ?? [];
  if (roles.includes("Super Admin")) redirect("/super");

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { status: true },
  });
  if (!org) redirect("/login");
  if (org.status === "suspended") redirect("/suspended");
  if (roles.includes("Owner")) return { orgId, userId: session.user.id!, roles };

  if (opts.roles && opts.roles.length > 0) {
    const display = roles.map((r) => DISPLAY_ALIASES[r] ?? r);
    const ok = opts.roles.some((r) => display.includes(r) || roles.includes(r));
    if (!ok) redirect("/dashboard");
  }

  return { orgId, userId: session.user.id!, roles };
}
