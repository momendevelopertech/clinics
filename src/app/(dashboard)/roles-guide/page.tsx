import { redirect } from "next/navigation";
import { isOwner, requireSuperAdmin } from "@/lib/roles";
import { RolesGuideClient } from "@/components/roles-guide/roles-guide-client";

/**
 * /roles-guide — internal Roles Guide (Owner + Super Admin only).
 * Super Admin can open this one clinic-shell page via a proxy exception
 * (src/proxy.ts); every other clinic page still forces /super.
 */
export default async function RolesGuidePage() {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin.ok) {
    let owner = false;
    try {
      owner = await isOwner();
    } catch {
      owner = false;
    }
    if (!owner) redirect("/dashboard");
  }
  return <RolesGuideClient />;
}
