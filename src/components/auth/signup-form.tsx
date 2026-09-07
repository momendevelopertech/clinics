"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldPlus,
  Sparkles,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { useLocale } from "@/components/locale/locale-provider";

type SignupFormProps = { t: Dictionary };

export function SignupForm({ t }: SignupFormProps) {
  const { lang } = useLocale();
  const [form, setForm] = useState({
    clinicName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    country: "",
    website: "",
    company: "",
    startedAt: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      clinicName: form.clinicName,
      ownerName: form.ownerName,
      email: form.email,
      password: form.password,
      phone: form.phone,
      city: form.city,
      country: form.country,
      website: form.website,
      company: form.company,
      startedAt: form.startedAt || Date.now(),
    };

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error === "An account with this email already exists."
            ? t["signup_emailTaken"]
            : t["signup_invalid"],
        );
        return;
      }

      setCreated(true);
    } catch {
      setError(t["common_error"]);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (created) {
    return (
      <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
        <div className="surface-panel w-full max-w-md rounded-[36px] border border-white/60 p-10 text-center">
          <div className="mx-auto grid size-16 place-content-center rounded-[20px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
            {t["signup_pendingTitle"]}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t["signup_pendingBody"]}
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t["auth_backToLogin"]}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/60 surface-panel lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden min-h-[700px] flex-col justify-between border-r border-white/55 bg-[linear-gradient(160deg,rgba(21,107,139,0.96),rgba(9,60,84,0.96))] p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              {t["landing_badge"]}
            </div>
            <h1 className="mt-6 max-w-md text-4xl font-semibold leading-[1.05] tracking-[-0.04em]">
              {t["signup_title"]}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/74">
              {t["signup_subtitle"]}
            </p>
          </div>

          <div className="grid gap-3">
            {[
              { icon: ShieldPlus, title: "", copy: t["landing_feature_multiTenantBody"] },
              { icon: Activity, title: t["landing_feature_scheduling"], copy: t["landing_feature_schedulingBody"] },
              { icon: CheckCircle2, title: t["landing_feature_reports"], copy: t["landing_feature_reportsBody"] },
            ].map((item) => (
              <div
                key={item.copy}
                className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-content-center rounded-[16px] bg-white/14">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/72">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[700px] items-center bg-white/72 px-6 py-8 dark:bg-slate-950/30 sm:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t["landing_navStartFree"]}
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {t["signup_title"]}
              </h2>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {/* Honeypot — hidden from humans */}
              <input
                aria-hidden="true"
                tabIndex={-1}
                autoComplete="off"
                value={form.company}
                onChange={(event) => update("company", event.target.value)}
                style={{ position: "absolute", left: "-9999px" }}
                name="company"
                type="text"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-foreground">
                    {t["signup_clinicName"]}
                  </span>
                  <input
                    required
                    value={form.clinicName}
                    onChange={(event) => update("clinicName", event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  />
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-foreground">
                    {t["signup_ownerName"]}
                  </span>
                  <input
                    required
                    value={form.ownerName}
                    onChange={(event) => update("ownerName", event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  />
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-foreground">
                    {t["signup_email"]}
                  </span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  />
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-foreground">
                    {t["signup_password"]}
                  </span>
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {t["signup_phone"]}
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {t["signup_city"]}
                  </span>
                  <input
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  />
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-foreground">
                    {t["signup_country"]}
                  </span>
                  <input
                    value={form.country}
                    onChange={(event) => update("country", event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                  />
                </label>
              </div>

              {error ? (
                <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-linear-to-r from-primary to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? t["signup_submitting"] : t["signup_submit"]}
                {!isSubmitting ? (
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                ) : null}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <span>{t["auth_backToLogin"]}</span>
              <Link href="/login" className="font-semibold text-primary hover:underline">
                {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}