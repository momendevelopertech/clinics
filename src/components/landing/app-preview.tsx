import {
  Activity,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";

const WEEK_BARS = [38, 52, 44, 68, 58, 82, 74];

const APPOINTMENTS = [
  { name: "Mona Ahmed", time: "09:00", status: "confirmed" },
  { name: "Khaled Hassan", time: "09:30", status: "waiting" },
  { name: "Sara Mostafa", time: "10:15", status: "confirmed" },
  { name: "Omar Farouk", time: "11:00", status: "done" },
];

export function AppPreview({ t }: { t: Dictionary }) {
  return (
    <div className="mx-auto mt-16 max-w-5xl text-start">
      <div className="relative rounded-lg border border-border surface-panel p-3 shadow-xl">
        <div className="overflow-hidden rounded-md bg-card text-card-foreground border border-border">
          {/* Mock topbar */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="grid size-7 place-content-center rounded-md bg-primary text-primary-foreground">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-foreground">{t["appName"]}</span>
              <div className="ms-3 hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <Search className="h-3.5 w-3.5" />
                {t["landing_previewSearch"]}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="grid size-7 place-content-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                AK
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] text-start">
            {/* Mock sidebar */}
            <div className="hidden flex-col gap-1 border-r border-border bg-muted/20 p-3 sm:flex">
              <SidebarPill icon={<LayoutDashboard className="h-4 w-4" />} active />
              <SidebarPill icon={<Users className="h-4 w-4" />} label={t["nav_patients"]} />
              <SidebarPill icon={<CalendarCheck2 className="h-4 w-4" />} label={t["nav_appointments"]} />
              <SidebarPill icon={<Stethoscope className="h-4 w-4" />} label={t["nav_encounters"]} />
              <SidebarPill icon={<CreditCard className="h-4 w-4" />} label={t["nav_billing"]} />
              <SidebarPill icon={<HeartPulse className="h-4 w-4" />} label={t["nav_reports"]} />
            </div>

            {/* Mock main */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MiniStat icon={<Users className="h-4 w-4" />} label={t["mtr_patients"]} value="3,428" delta="+12%" />
                <MiniStat icon={<CalendarCheck2 className="h-4 w-4" />} label={t["nav_appointments"]} value="214" delta="+8%" />
                <MiniStat icon={<CreditCard className="h-4 w-4" />} label={t["nav_billing"]} value="$1.2k" delta="+23%" />
                <MiniStat icon={<TrendingUp className="h-4 w-4" />} label={t["landing_statsAppointments"]} value="97%" delta="+4%" />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                {/* Mock weekly chart */}
                <div className="rounded-lg border border-border p-4 bg-card">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{t["landing_previewWeekly"]}</span>
                    <span className="text-muted-foreground">{t["landing_previewAppointments"]}</span>
                  </div>
                  <div className="mt-4 flex h-28 items-end gap-2">
                    {WEEK_BARS.map((height, index) => (
                      <div key={index} className="group relative flex-1">
                        <div
                          className={`w-full rounded-sm ${index === 5 ? "bg-primary" : "bg-muted group-hover:bg-primary/50"}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <span key={day} className="flex-1 text-center">{day}</span>
                    ))}
                  </div>
                </div>

                {/* Mock list */}
                <div className="rounded-lg border border-border p-4 bg-card">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{t["landing_previewToday"]}</span>
                    <span className="text-muted-foreground">{t["nav_queue"]}</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {APPOINTMENTS.map((appointment) => (
                      <div key={appointment.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-content-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {appointment.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{appointment.name}</p>
                            <p className="text-[10px] text-muted-foreground">{appointment.time}</p>
                          </div>
                        </div>
                        {appointment.status === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-success-text" />
                        ) : (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              appointment.status === "waiting"
                                ? "bg-warning-bg text-warning-text"
                                : "bg-accent-blue-bg text-accent-blue-text"
                            }`}
                          >
                            {t[`landing_previewStatus_${appointment.status}`]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarPill({ icon, label, active }: { icon: React.ReactNode; label?: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium ${
        active ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label ? <span>{label}</span> : null}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-md border border-border p-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="grid size-7 place-content-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <span className="rounded-full bg-success-bg px-1.5 py-0.5 text-[10px] font-semibold text-success-text">
          {delta}
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}