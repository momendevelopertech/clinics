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
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
      <div className="border-b border-border bg-muted-bg p-5">
        <h2 className="text-lg font-bold text-foreground">{name}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {city ? <span>{city}</span> : null}
          <span className="rounded-full bg-success-bg border border-success/30 px-2 py-0.5 text-[11px] font-semibold text-success-text">
            {t["auth_activeTenant"]}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            {t["auth_passwordLabel"]}: {password}
          </span>
          {notes ? <span className="text-[11px] text-muted-foreground">{notes}</span> : null}
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
      <table className="w-full min-w-[400px] text-left text-xs rtl:text-right">
        <thead className="bg-muted-bg text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <tr>
            <th className="px-3 py-2.5 font-semibold">{t["auth_demoRole"]}</th>
            <th className="px-3 py-2.5 font-semibold">{t["auth_staffEmail"]}</th>
            <th className="px-3 py-2.5 text-right font-semibold rtl:text-left">
              <span className="sr-only">{t["auth_fastLogin"]}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-3 py-2.5 font-semibold text-foreground">{row.role}</td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{row.email}</td>
              <td className="px-3 py-2.5 text-right rtl:text-left">
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
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t["auth_backToLogin"]}
          </Link>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {t["auth_devOnly"]}
          </span>
        </div>

        <header className="mt-8 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{t["auth_demoLogins"]}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t["auth_demoAccountsTitle"]}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t["auth_demoAccountsSubtitle"]}</p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
              <div className="mt-4 rounded-lg border border-primary/25 bg-primary/10 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-foreground">{t["auth_demoPatient"]}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
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
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-muted"
                    >
                      {t["auth_patientPortal"]}
                      <ExternalLink className="h-3 w-3" />
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

        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" />
          {t["auth_demoAccountsNote"]}
        </p>

        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors"
        >
          <Building2 className="h-4 w-4" />
          {t["auth_staffPortal"]}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </main>
  );
}