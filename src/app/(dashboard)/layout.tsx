import * as React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/roles"
import { resolveOrgEntitlements } from "@/lib/entitlements/resolve"
import { Toaster } from "@/components/ui/sonner"
import { MedicalProvider } from "@/context/MedicalContext"
import { RoleProvider } from "@/context/RoleContext"
import { FeatureTipsProvider } from "@/components/feature-tips/feature-tips-provider"
import { DashboardWithCollapsibleSidebar } from "@/components/ui/dashboard-with-collapsible-sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const orgId = session?.user?.organizationId
  const roles = session?.user?.roles ?? []
  const superAdmin = await requireSuperAdmin()

  let planModules: Record<string, boolean> | null = null
  if (orgId) {
    try {
      planModules = (await resolveOrgEntitlements(orgId)).modules
    } catch {
      planModules = null
    }
  }

  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { status: true, name: true },
    })

    if (org && org.status === "suspended") {
      redirect("/suspended")
    }

    if (org) {
      return (
        <MedicalProvider>
          <RoleProvider roles={roles} userId={session?.user?.id ?? null}>
            <FeatureTipsProvider>
              <DashboardWithCollapsibleSidebar
                roles={roles}
                isSuperAdmin={superAdmin.ok}
                orgName={org.name}
                planModules={planModules}
              >
                {children}
              </DashboardWithCollapsibleSidebar>
              <Toaster position="top-right" richColors />
            </FeatureTipsProvider>
          </RoleProvider>
        </MedicalProvider>
      )
    }
  }

  return (
    <MedicalProvider>
      <RoleProvider roles={roles} userId={session?.user?.id ?? null}>
        <FeatureTipsProvider>
          <DashboardWithCollapsibleSidebar
            roles={roles}
            isSuperAdmin={superAdmin.ok}
          >
            {children}
          </DashboardWithCollapsibleSidebar>
          <Toaster position="top-right" richColors />
        </FeatureTipsProvider>
      </RoleProvider>
    </MedicalProvider>
  )
}