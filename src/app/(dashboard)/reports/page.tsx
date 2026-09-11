import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary } from "@/lib/i18n/server";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { ReportScheduleCard } from "@/components/reports/report-schedule-card";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  const t = await getDictionary();

  return (
    <div className="space-y-6">
      <ReportsDashboard t={t} />
      <ReportScheduleCard t={t} />
    </div>
  );
}