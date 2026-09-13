"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Calendar, Clock, Wallet, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";

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
  expensesThisMonth?: number;
  netProfitThisMonth?: number;
  avgRatingThisMonth?: number | null;
  ratingsCountThisMonth?: number;
};

export default function AnalyticsPage() {
  const { t } = useLocale();
  const [stats, setStats] = React.useState<DashboardKpis | null>(null);
  const { forbidden, guardedFetch } = usePermissionState();

  React.useEffect(() => {
    guardedFetch<{ kpis: DashboardKpis }>("/api/analytics/dashboard", {
      cache: "no-store",
    })
      .then((payload) => {
        if (payload) setStats(payload.kpis);
      })
      .catch(() => setStats(null));
  }, [guardedFetch]);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight">{t("analytics_title")}</h1>
        <PermissionDenied
          title={t("analytics_forbiddenTitle") ?? "You don't have permission"}
          description={t("analytics_forbidden") ?? "Your role can't view the analytics and revenue dashboard."}
        />
      </div>
    );
  }

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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="rounded-lg border border-border bg-white shadow-2xs">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <c.icon className="w-4 h-4 text-primary" />
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <span className="text-2xl font-bold tracking-tight text-foreground">{c.value}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-lg border border-border bg-white shadow-2xs">
        <CardHeader className="p-5 border-b border-border bg-[#F8FAFC]">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" />
            {t("analytics_operationalMetrics")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label={t("analytics_completionRate")} value={`${stats?.monthlyCompletionRate ?? "—"}%`} />
            <Metric label={t("analytics_noShowRate")} value={`${stats?.monthlyNoShowRate ?? "—"}%`} icon={UserX} />
            <Metric label={t("analytics_revenue")} value={stats ? `$${stats.revenueThisMonth.toFixed(2)}` : "—"} icon={Wallet} />
            <Metric label={t("analytics_outstanding")} value={stats ? `$${stats.outstandingBalance.toFixed(2)}` : "—"} icon={Wallet} />
            <Metric label={t("analytics_expenses")} value={stats?.expensesThisMonth != null ? `$${stats.expensesThisMonth.toFixed(2)}` : "—"} icon={Wallet} />
            <Metric label={t("analytics_netProfit")} value={stats?.netProfitThisMonth != null ? `$${stats.netProfitThisMonth.toFixed(2)}` : "—"} icon={Wallet} />
            <Metric
              label={t("analytics_avgRating")}
              value={stats?.avgRatingThisMonth != null ? `${stats.avgRatingThisMonth} ★ (${stats.ratingsCountThisMonth ?? 0})` : "—"}
              icon={Wallet}
            />
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
    <div className="rounded-lg border border-border bg-[#F8FAFC] p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
