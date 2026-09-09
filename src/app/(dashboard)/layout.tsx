import * as React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/roles"
import { Toaster } from "@/components/ui/sonner"
import { MedicalProvider } from "@/context/MedicalContext"
import { FeatureTipsProvider } from "@/components/feature-tips/feature-tips-provider"
import { DashboardWithCollapsibleSidebar } from "@/components/ui/dashboard-with-collapsible-sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const orgId = session?.user?.organizationId
  const roles = session?.user?.roles ?? []
  const superAdmin = await requireSuperAdmin()

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
          <FeatureTipsProvider>
            <DashboardWithCollapsibleSidebar
              roles={roles}
              isSuperAdmin={superAdmin.ok}
              orgName={org.name}
            >
              {children}
            </DashboardWithCollapsibleSidebar>
            <Toaster position="top-right" richColors />
          </FeatureTipsProvider>
        </MedicalProvider>
      )
    }
  }

  return (
    <MedicalProvider>
      <FeatureTipsProvider>
        <DashboardWithCollapsibleSidebar
          roles={roles}
          isSuperAdmin={superAdmin.ok}
        >
          {children}
        </DashboardWithCollapsibleSidebar>
        <Toaster position="top-right" richColors />
      </FeatureTipsProvider>
    </MedicalProvider>
  )
}