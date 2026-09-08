"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Activity, ArrowRight, ShieldPlus, Stethoscope, TimerReset } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/locale/language-switcher";

type LoginFormProps = {
  callbackUrl: string;
  error: string | null;
  t: Dictionary;
};

const demoStaffLogins = [
  { email: "superadmin@acmeclinic.com", password: "admin123", roleKey: "auth_demoSuperAdmin" },
  { email: "admin@acmeclinic.com", password: "admin123", roleKey: "auth_demoDoctor" },
  { email: "dr.fatma@acmeclinic.com", password: "admin123", roleKey: "auth_demoDoctor2" },
  { email: "owner@acmeclinic.com", password: "admin123", roleKey: "auth_demoOwner" },
  { email: "ops@acmeclinic.com", password: "admin123", roleKey: "auth_demoCoordinator" },
  { email: "receptionist@acmeclinic.com", password: "admin123", roleKey: "auth_demoReceptionist" },
  { email: "billing@acmeclinic.com", password: "admin123", roleKey: "auth_demoBiller" },
  { email: "nurse@acmeclinic.com", password: "admin123", roleKey: "auth_demoNurse" },
  { email: "pharmacist@acmeclinic.com", password: "admin123", roleKey: "auth_demoPharmacist" },
];

function handleFastLogin(email: string, password: string, callbackUrl: string) {
  void signIn("credentials", {
    email,
    password,
    redirect: true,
    callbackUrl,
  });
}

export function LoginForm({ callbackUrl, error, t }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authError = error === "CredentialsSignin" ? t["auth_invalidCredentials"] : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    // Use NextAuth's built-in server redirect (redirect: true): the session
    // cookie is set in the SAME response as the 302, so the auth proxy sees it
    // immediately and no login<->dashboard redirect loop occurs on Vercel.
    void signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl,
    });
  }

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/60 surface-panel lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[640px] flex-col justify-between border-r border-white/55 bg-[linear-gradient(160deg,rgba(21,107,139,0.96),rgba(9,60,84,0.96))] p-10 text-white lg:flex">
          <div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                <Activity className="h-3.5 w-3.5" />
                {t["appTagline"]}
              </div>
              <LanguageSwitcher />
            </div>
            <h1 className="mt-6 max-w-md text-5xl font-semibold leading-[1.02] tracking-[-0.05em]">
              {t["auth_loginTitle"]}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/74">
              {t["auth_loginSubtitle"]}
            </p>
          </div>

          <div className="grid gap-3">
            {[
              {
                icon: ShieldPlus,
                title: t["landing_feature_multiTenant"],
                copy: t["landing_feature_multiTenantBody"],
              },
              {
                icon: TimerReset,
                title: t["landing_feature_scheduling"],
                copy: t["landing_feature_schedulingBody"],
              },
              {
                icon: Stethoscope,
                title: t["landing_feature_emr"],
                copy: t["landing_feature_emrBody"],
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-content-center rounded-[16px] bg-white/14">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/72">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[640px] items-center bg-white/72 px-6 py-8 dark:bg-slate-950/30 sm:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t["auth_staffAccess"]}
              </p>
              <h2 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
                {t["auth_loginTitle"]}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {t["auth_loginSubtitle"]}
              </p>
            </div>

            <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t["auth_email"]}
                </span>
                <input
                  autoComplete="email"
                  className="h-13 w-full rounded-[20px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>

              <label className="block space-y-2">
                <span className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{t["auth_password"]}</span>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t["auth_forgotPassword"]}
                  </Link>
                </span>
                <input
                  autoComplete="current-password"
                  className="h-13 w-full rounded-[20px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </label>

              {authError ? (
                <p className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
                  {authError}
                </p>
              ) : null}

              <button
                className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-linear-to-r from-primary to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? t["auth_signingIn"] : t["auth_enterWorkspace"]}
                {!isSubmitting ? <ArrowRight className="h-4 w-4 rtl:rotate-180" /> : null}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {t["auth_needAccount"]}{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                {t["auth_signup"]}
              </Link>
            </div>

            <div className="mt-6 grid gap-3 rounded-[24px] border border-white/60 bg-white/60 p-4 text-sm dark:border-white/6 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t["auth_defaultRoute"]}</span>
                <span className="font-medium text-foreground">{t["nav_dashboard"]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t["auth_sessionMode"]}</span>
                <span className="font-medium text-foreground">{t["auth_credentialBased"]}</span>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-cyan-100 bg-cyan-50/70 p-4 text-sm shadow-sm shadow-cyan-950/5 dark:border-cyan-400/15 dark:bg-cyan-400/8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">{t["auth_demoLogins"]}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Local testing accounts from the demo seed.
                  </p>
                </div>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-cyan-800 shadow-sm dark:bg-white/10 dark:text-cyan-200">
                  {t["auth_devOnly"]}
                </span>
              </div>

              <Link
                href="/demo-accounts"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-[14px] border border-cyan-200 bg-white/80 px-3 py-2.5 text-xs font-semibold text-cyan-800 transition hover:bg-white dark:border-cyan-400/20 dark:bg-white/[0.04] dark:text-cyan-200"
              >
                {t["auth_viewDemoAccounts"]}
              </Link>

              <div className="mt-4 grid gap-2">
                {demoStaffLogins.map((login) => (
                  <div
                    className="grid gap-1 rounded-[16px] bg-white/72 px-3 py-2.5 text-xs dark:bg-white/[0.04] sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3"
                    key={login.email}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium text-foreground">{login.email}</span>
                      <span className="font-medium text-primary">{t[login.roleKey]}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">{login.password}</span>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-[14px] bg-linear-to-r from-primary to-cyan-500 px-3 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isSubmitting}
                      onClick={() => handleFastLogin(login.email, login.password, callbackUrl)}
                      type="button"
                    >
                      {isSubmitting ? t["auth_signingIn"] : t["auth_fastLogin"]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}