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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-xl">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto grid size-12 place-content-center rounded-full bg-success-bg border border-success/30 text-success-text">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              {t["forgot_sent"]}
            </h1>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary hover:bg-primary/90 px-5 text-xs font-semibold text-primary-foreground transition-colors shadow-xs"
              >
                {t["auth_backToLogin"]}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1.5 text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {t["forgot_title"]}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t["forgot_title"]}
              </h1>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t["forgot_subtitle"]}
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  {t["auth_email"]}
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </label>

              {error ? (
                <p className="rounded-md border border-critical/30 bg-critical-bg p-3 text-xs font-medium text-critical-text">
                  {error}
                </p>
              ) : null}

              <button
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-4 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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

            <div className="mt-5 text-center text-xs">
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