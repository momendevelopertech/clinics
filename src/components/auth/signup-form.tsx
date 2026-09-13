"use client";

import { useRef, useState, type FormEvent } from "react";
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
  // Records when the user starts filling the form (first interaction), so the
  // server-side min-fill-time anti-bot check compares against a real human
  // start time instead of the submission moment (which would always be <3s).
  const startedAtRef = useRef(0);
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
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  function update(field: keyof typeof form, value: string) {
    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now();
    }
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
      startedAt: startedAtRef.current || Date.now(),
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
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8 sm:px-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-xl">
          <div className="mx-auto grid size-12 place-content-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
            {t["signup_pendingTitle"]}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t["signup_pendingBody"]}
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary hover:bg-[#115E59] px-5 text-xs font-semibold text-white transition-colors shadow-2xs"
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
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-xl lg:grid-cols-[1fr_1fr]">
        <section className="relative hidden min-h-[640px] flex-col justify-between border-r border-border bg-[#0F766E] p-8 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              {t["landing_badge"]}
            </div>
            <h1 className="mt-8 max-w-md text-3xl font-bold leading-tight tracking-tight">
              {t["signup_title"]}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
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
                className="rounded-lg border border-white/15 bg-white/10 p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-content-center rounded-md bg-white/15">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-white/75">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[640px] items-center bg-white px-6 py-8 sm:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {t["landing_navStartFree"]}
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t["signup_title"]}
              </h2>
            </div>

            <form className="mt-6 space-y-3.5" onSubmit={handleSubmit}>
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

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t["signup_clinicName"]}
                  </span>
                  <input
                    required
                    value={form.clinicName}
                    onChange={(event) => update("clinicName", event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </label>

                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t["signup_ownerName"]}
                  </span>
                  <input
                    required
                    value={form.ownerName}
                    onChange={(event) => update("ownerName", event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </label>

                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t["signup_email"]}
                  </span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </label>

                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t["signup_password"]}
                  </span>
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-foreground">
                    {t["signup_phone"]}
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-foreground">
                    {t["signup_city"]}
                  </span>
                  <input
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </label>

                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t["signup_country"]}
                  </span>
                  <input
                    value={form.country}
                    onChange={(event) => update("country", event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </label>
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary hover:bg-[#115E59] px-4 text-xs font-semibold text-white transition-colors shadow-2xs disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? t["signup_submitting"] : t["signup_submit"]}
                {!isSubmitting ? (
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                ) : null}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
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