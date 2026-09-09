import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ExternalLink, KeyRound } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/locale";
import { DEMO_PASSWORD, DEMO_PATIENT_PASSWORD, DEMO_TENANTS, LOCAL_SEED_ACCOUNTS, LOCAL_SEED_ORG, LOCAL_SEED_PASSWORD } from "@/lib/demo-accounts";
import { DemoQuickLogin } from "@/components/demo/demo-quick-login";
import { PatientQuickLogin } from "@/components/demo/patient-quick-login";

type CardProps = {
  t: Dictionary;
  name: string;
  city?: string;
  password: string;
  notes?: string;
  children: ReactNode;
};

function AccountCard({ t, name, city, password, notes, children }: CardProps) {
  return (
    <section className="surface-panel overflow-hidden rounded-[28px] border border-white/55">
      <div className="border-b border-border/70 bg-white/45 p-6 dark:bg-white/[0.03]">
        <h2 className="text-xl font-semibold text-foreground">{name}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {city ? <span>{city}</span> : null}
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            {t["auth_activeTenant"]}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/70 px-3 py-1 font-mono text-xs font-semibold text-foreground dark:bg-white/[0.05]">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            {t["auth_passwordLabel"]}: {password}
          </span>
          {notes ? <span className="text-xs text-muted-foreground">{notes}</span> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function AccountTable({
  t,
  password,
  rows,
}: {
  t: Dictionary;
  password: string;
  rows: Array<{ id: string; role: string; email: string }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[440px] text-left text-sm rtl:text-right">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-semibold">{t["auth_demoRole"]}</th>
            <th className="px-3 py-3 font-semibold">{t["auth_staffEmail"]}</th>
            <th className="px-3 py-3 text-right font-semibold rtl:text-left">
              <span className="sr-only">{t["auth_fastLogin"]}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border/60">
              <td className="px-3 py-3 font-medium text-foreground">{row.role}</td>
              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.email}</td>
              <td className="px-3 py-3 text-right rtl:text-left">
                <DemoQuickLogin email={row.email} password={password} label={t["auth_fastLogin"]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DemoAccountsPage() {
  const t = await getDictionary();

  return (
    <main className="hero-glow min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t["auth_backToLogin"]}
          </Link>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
            {t["auth_devOnly"]}
          </span>
        </div>

        <header className="mt-12 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{t["auth_demoLogins"]}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            {t["auth_demoAccountsTitle"]}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{t["auth_demoAccountsSubtitle"]}</p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {DEMO_TENANTS.map((tenant) => (
            <AccountCard
              key={tenant.name}
              t={t}
              name={tenant.name}
              city={tenant.city}
              password={DEMO_PASSWORD}
            >
              <AccountTable
                t={t}
                password={DEMO_PASSWORD}
                rows={tenant.accounts.map((account) => ({
                  id: account.email,
                  role: t[account.roleKey],
                  email: account.email,
                }))}
              />
              <div className="mt-4 rounded-[18px] border border-cyan-200/70 bg-cyan-50/70 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{t["auth_demoPatient"]}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {tenant.patient.email} / {tenant.patient.mrn} / {DEMO_PATIENT_PASSWORD}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PatientQuickLogin
                      email={tenant.patient.email}
                      mrn={tenant.patient.mrn}
                      password={DEMO_PATIENT_PASSWORD}
                      label={t["auth_patientFastLogin"]}
                    />
                    <Link
                      href="/patient-login"
                      className="inline-flex items-center gap-1.5 rounded-[14px] border border-cyan-600/40 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:text-cyan-200 dark:hover:bg-cyan-400/10"
                    >
                      {t["auth_patientPortal"]}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </AccountCard>
          ))}

          <div className="lg:col-span-2">
            <AccountCard
              t={t}
              name={t["auth_localSeedTitle"]}
              city={LOCAL_SEED_ORG}
              password={LOCAL_SEED_PASSWORD}
              notes={t["auth_localSeedSubtitle"]}
            >
              <AccountTable
                t={t}
                password={LOCAL_SEED_PASSWORD}
                rows={LOCAL_SEED_ACCOUNTS.map((account) => ({
                  id: account.email,
                  role: t[account.roleKey],
                  email: account.email,
                }))}
              />
            </AccountCard>
          </div>
        </div>

        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="h-4 w-4" />
          {t["auth_demoAccountsNote"]}
        </p>

        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-2 rounded-[14px] bg-linear-to-r from-primary to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px]"
        >
          <Building2 className="h-4 w-4" />
          {t["auth_staffPortal"]}
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}