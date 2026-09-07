"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Calendar, Clock, Wallet, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale/locale-provider";

type DashboardKpis = {
  activePatients: number;
  appointmentsToday: number;
  activeAppointmentsToday: number;
  completedEncountersThisMonth: number;
  averageVisitMinutes: number;
  monthlyCompletionRate: number;
  monthlyNoShowRate: number;
  revenueThisMonth: number;
  outstandingBalance: number;
};

export default function AnalyticsPage() {
  const { t } = useLocale();
  const [stats, setStats] = React.useState<DashboardKpis | null>(null);

  React.useEffect(() => {
    fetch("/api/analytics/dashboard", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load analytics");
        return response.json();
      })
      .then((payload: { kpis: DashboardKpis }) => setStats(payload.kpis))
      .catch(() => setStats(null));
  }, []);

  const cards = [
    { label: t("analytics_totalPatients"), value: stats?.activePatients ?? "—", icon: Users },
    { label: t("analytics_appointmentsToday"), value: stats?.appointmentsToday ?? "—", icon: Calendar },
    { label: t("analytics_encounters"), value: stats?.completedEncountersThisMonth ?? "—", icon: BarChart3 },
    {
      label: t("analytics_avgVisit"),
      value: stats ? `${stats.averageVisitMinutes} ${t("analytics_min")}` : "—",
      icon: Clock,
    },
  ];

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold tracking-tight">{t("analytics_title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                  <c.icon className="w-4 h-4" />
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{c.value}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("analytics_operationalMetrics")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label={t("analytics_completionRate")} value={`${stats?.monthlyCompletionRate ?? "—"}%`} />
            <Metric label={t("analytics_noShowRate")} value={`${stats?.monthlyNoShowRate ?? "—"}%`} icon={UserX} />
            <Metric label={t("analytics_revenue")} value={stats ? `$${stats.revenueThisMonth.toFixed(2)}` : "—"} icon={Wallet} />
            <Metric label={t("analytics_outstanding")} value={stats ? `$${stats.outstandingBalance.toFixed(2)}` : "—"} icon={Wallet} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  icon: Icon = BarChart3,
}: {
  label: string;
  value: string;
  icon?: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
