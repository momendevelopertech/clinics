import Link from "next/link";
import { ArrowLeft, ExternalLink, KeyRound } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { DEMO_PASSWORD, DEMO_TENANTS } from "@/lib/demo-accounts";

export default async function DemoAccountsPage() {
  const t = await getDictionary();

  return (
    <main className="hero-glow min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl">
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
            <section key={tenant.name} className="surface-panel overflow-hidden rounded-[28px] border border-white/55">
              <div className="border-b border-border/70 bg-white/45 p-6 dark:bg-white/[0.03]">
                <h2 className="text-xl font-semibold text-foreground">{tenant.name}</h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{tenant.city}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                    {t["auth_activeTenant"]}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-left text-sm rtl:text-right">
                    <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3 font-semibold">{t["auth_demoRole"]}</th>
                        <th className="px-3 py-3 font-semibold">{t["auth_staffEmail"]}</th>
                        <th className="px-3 py-3 font-semibold">{t["auth_passwordLabel"]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.accounts.map((account) => (
                        <tr key={account.email} className="border-t border-border/60">
                          <td className="px-3 py-3 font-medium text-foreground">{account.role}</td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{account.email}</td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{DEMO_PASSWORD}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center gap-2 rounded-[14px] bg-linear-to-r from-primary to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px]"
                >
                  {t["auth_staffPortal"]}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="h-4 w-4" />
          {t["auth_demoAccountsNote"]}
        </p>
      </div>
    </main>
  );
}
