import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary } from "@/lib/i18n/server";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const t = await getDictionary();

  return <ReportsDashboard t={t} />;
}