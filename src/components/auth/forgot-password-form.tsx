"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";

type ForgotPasswordFormProps = { t: Dictionary };

export function ForgotPasswordForm({ t }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setError(t["common_error"]);
        return;
      }
      setSent(true);
    } catch {
      setError(t["common_error"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface-panel w-full max-w-md rounded-[36px] border border-white/60 p-10">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto grid size-16 place-content-center rounded-[20px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
              {t["forgot_sent"]}
            </h1>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20"
              >
                {t["auth_backToLogin"]}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t["forgot_title"]}
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {t["forgot_title"]}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {t["forgot_subtitle"]}
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t["auth_email"]}
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-13 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                />
              </label>

              {error ? (
                <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-[18px] bg-linear-to-r from-primary to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {submitting ? "..." : t["forgot_submit"]}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link href="/login" className="font-semibold text-primary hover:underline">
                {t["forgot_back"]}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}