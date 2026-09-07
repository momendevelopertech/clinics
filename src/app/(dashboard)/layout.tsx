import * as React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Toaster } from "@/components/ui/sonner"
import { MedicalProvider } from "@/context/MedicalContext"
import { DashboardWithCollapsibleSidebar } from "@/components/ui/dashboard-with-collapsible-sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const orgId = session?.user?.organizationId

  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { status: true },
    })

    if (org && org.status === "suspended") {
      redirect("/suspended")
    }
  }

  return (
    <MedicalProvider>
      <DashboardWithCollapsibleSidebar>
        {children}
      </DashboardWithCollapsibleSidebar>
      <Toaster position="top-right" richColors />
    </MedicalProvider>
  )
}