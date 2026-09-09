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
      <div className="relative rounded-[32px] border border-white/55 surface-panel p-3 shadow-2xl shadow-cyan-900/10 dark:border-white/6">
        <div className="overflow-hidden rounded-[24px] bg-white text-slate-800">
          {/* Mock topbar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-7 place-content-center rounded-[10px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold">{t["appName"]}</span>
              <div className="ms-3 hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 sm:flex">
                <Search className="h-3.5 w-3.5" />
                {t["landing_previewSearch"]}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-slate-400" />
              <Clock className="h-4 w-4 text-slate-400" />
              <div className="grid size-7 place-content-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 text-[10px] font-bold text-white">
                AK
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] text-start">
            {/* Mock sidebar */}
            <div className="hidden flex-col gap-1 border-r border-slate-100 bg-slate-50/70 p-3 sm:flex">
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
                <div className="rounded-[18px] border border-slate-200 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{t["landing_previewWeekly"]}</span>
                    <span className="text-slate-400">{t["landing_previewAppointments"]}</span>
                  </div>
                  <div className="mt-4 flex h-28 items-end gap-2">
                    {WEEK_BARS.map((height, index) => (
                      <div key={index} className="group relative flex-1">
                        <div
                          className={`w-full rounded-[6px] ${index === 5 ? "bg-linear-to-t from-teal-500 to-emerald-400" : "bg-slate-200 group-hover:bg-teal-200"}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2 text-[10px] text-slate-400">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <span key={day} className="flex-1 text-center">{day}</span>
                    ))}
                  </div>
                </div>

                {/* Mock list */}
                <div className="rounded-[18px] border border-slate-200 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{t["landing_previewToday"]}</span>
                    <span className="text-slate-400">{t["nav_queue"]}</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {APPOINTMENTS.map((appointment) => (
                      <div key={appointment.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-content-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 text-[10px] font-bold text-white">
                            {appointment.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{appointment.name}</p>
                            <p className="text-[10px] text-slate-400">{appointment.time}</p>
                          </div>
                        </div>
                        {appointment.status === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              appointment.status === "waiting"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-teal-100 text-teal-700"
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

        <div className="pointer-events-none absolute -inset-px rounded-[32px] ring-1 ring-primary/10" />
      </div>
    </div>
  );
}

function SidebarPill({ icon, label, active }: { icon: React.ReactNode; label?: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-xs ${
        active ? "bg-teal-500 text-white shadow-sm" : "text-slate-500"
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
    <div className="rounded-[16px] border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <div className="grid size-7 place-content-center rounded-[10px] bg-teal-50 text-teal-600">{icon}</div>
        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
          {delta}
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-800">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}