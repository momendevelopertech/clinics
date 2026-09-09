import { Building2, MapPin, ShieldCheck, Users2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { DEMO_TENANTS, LOCAL_SEED_ORG } from "@/lib/demo-accounts";

const CLINICS = [
  ...DEMO_TENANTS.map((tenant, index) => ({
    name: tenant.name,
    location: tenant.city,
    staff: tenant.accounts.length,
    code: index === 0 ? "ALX" : "SMH",
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
  })),
  {
    name: "Acme Clinic",
    location: LOCAL_SEED_ORG,
    staff: 9,
    code: "ACM",
    gradient: "from-violet-500 via-fuchsia-500 to-rose-500",
  },
];

export function ClinicShowcase({ t }: { t: Dictionary }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CLINICS.map((clinic) => (
        <div
          key={clinic.code}
          className="group relative overflow-hidden rounded-[28px] border border-white/55 surface-panel p-6 transition hover:-translate-y-0.5 dark:border-white/6"
        >
          <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${clinic.gradient}`} />
          <div className="flex items-start justify-between gap-3">
            <div className={`grid size-12 place-content-center rounded-[18px] bg-linear-to-br ${clinic.gradient} text-sm font-bold text-white shadow-lg`}>
              {clinic.code}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t["sub_statusactive"]}
            </span>
          </div>

          <h3 className="mt-5 text-base font-semibold leading-snug">{clinic.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span dir="auto">{clinic.location}</span>
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Users2 className="h-4 w-4" />
            <span>{clinic.staff} staff</span>
            <span className="mx-1 text-border">·</span>
            <Building2 className="h-4 w-4" />
            <span>{clinic.code.toLowerCase()}.demo</span>
          </div>

          {/* Mock activity sparkline */}
          <div className="mt-4 flex h-8 items-end gap-1">
            {[40, 60, 45, 80, 65, 90, 72, 55, 85, 70, 95, 62].map((height, index) => (
              <div
                key={index}
                style={{ height: `${height}%` }}
                className="flex-1 rounded-[3px] bg-primary/20 transition group-hover:bg-primary/40"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}