"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Activity, ArrowRight, KeyRound, ShieldPlus, Stethoscope, TimerReset } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/locale/language-switcher";
import { DemoLoginButtons } from "@/components/landing/demo-login-buttons";

type LoginFormProps = {
  callbackUrl: string;
  error: string | null;
  t: Dictionary;
};

export function LoginForm({ callbackUrl, error, t }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsTwoFactor = error === "2FA_REQUIRED";
  const authError =
    error === "CredentialsSignin" ? t["auth_invalidCredentials"] : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    // Use NextAuth's built-in server redirect (redirect: true): the session
    // cookie is set in the SAME response as the 302, so the auth proxy sees it
    // immediately and no login<->dashboard redirect loop occurs on Vercel.
    void signIn("credentials", {
      email,
      password,
      ...(needsTwoFactor ? { totpToken } : {}),
      redirect: true,
      callbackUrl,
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-xl lg:grid-cols-[1fr_1fr]">
        <section className="relative hidden min-h-[600px] flex-col justify-between border-r border-border bg-[#0F766E] p-8 text-white lg:flex">
          <div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
                <Activity className="h-3.5 w-3.5" />
                {t["appTagline"]}
              </div>
              <LanguageSwitcher />
            </div>
            <h1 className="mt-8 max-w-md text-3xl font-bold leading-tight tracking-tight">
              {t["auth_loginTitle"]}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
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
                className="rounded-lg border border-white/15 bg-white/10 p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-content-center rounded-md bg-white/15">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-white/75">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[600px] items-center bg-white px-6 py-8 sm:px-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {t["auth_staffAccess"]}
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t["auth_loginTitle"]}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t["auth_loginSubtitle"]}
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  {t["auth_email"]}
                </span>
                <input
                  autoComplete="email"
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                  required
                />
              </label>

              <label className="block space-y-1.5">
                <span className="flex items-center justify-between text-xs font-semibold text-foreground">
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
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                  required
                />
              </label>

              {authError ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {authError}
                </p>
              ) : null}

              {needsTwoFactor ? (
                <>
                  <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-xs font-medium text-cyan-800">
                    {t["auth_twoFactorRequired"]}
                  </p>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {t["auth_twoFactorCode"]}
                    </span>
                    <input
                      autoComplete="one-time-code"
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-center font-mono text-base tracking-widest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      name="totpToken"
                      inputMode="numeric"
                      onChange={(event) => setTotpToken(event.target.value)}
                      value={totpToken}
                      required
                    />
                  </label>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t["auth_twoFactorHint"]}
                  </p>
                </>
              ) : null}

              <button
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary hover:bg-[#115E59] px-4 text-xs font-semibold text-white transition-colors shadow-2xs disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? t["auth_signingIn"] : t["auth_enterWorkspace"]}
                {!isSubmitting ? <ArrowRight className="h-4 w-4 rtl:rotate-180" /> : null}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              {t["auth_needAccount"]}{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                {t["auth_signup"]}
              </Link>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-[#F8FAFC] p-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  {t["auth_tryDemo"]}
                </span>
                <Link
                  href="/demo-accounts"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t["auth_fullDemoList"]}
                </Link>
              </div>
              <DemoLoginButtons />
            </div>

            <div className="mt-4 grid gap-2 rounded-lg border border-border bg-[#F8FAFC] p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t["auth_defaultRoute"]}</span>
                <span className="font-medium text-foreground">{t["nav_dashboard"]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t["auth_sessionMode"]}</span>
                <span className="font-medium text-foreground">{t["auth_credentialBased"]}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}