"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2, XCircle } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";

type ResetPasswordFormProps = {
  t: Dictionary;
  initialToken: string;
  initialEmail: string;
};

export function ResetPasswordForm({
  t,
  initialToken,
  initialEmail,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "invalid">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t["common_error"]);
      return;
    }

    if (!initialToken || !initialEmail) {
      setState("invalid");
      return;
    }

    setState("submitting");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: initialToken, email: initialEmail, password }),
      });
      const data = await response.json();

      if (response.ok && data?.ok) {
        setState("success");
      } else {
        setState("invalid");
      }
    } catch {
      setState("invalid");
    }
  }

  if (state === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto grid size-12 place-content-center rounded-full bg-success-bg border border-success/30 text-success-text">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">{t["reset_success"]}</h1>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary hover:bg-primary/90 px-5 text-xs font-semibold text-primary-foreground transition-colors shadow-xs"
            >
              {t["auth_backToLogin"]}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (state === "invalid") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto grid size-12 place-content-center rounded-full bg-critical-bg border border-critical/30 text-critical-text">
            <XCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">{t["reset_invalidToken"]}</h1>
          <div className="mt-6">
            <Link
              href="/forgot-password"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary hover:bg-primary/90 px-5 text-xs font-semibold text-primary-foreground transition-colors shadow-xs"
            >
              {t["forgot_title"]}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-xl">
        <div className="space-y-1.5 text-center sm:text-start">
          <div className="grid size-10 place-content-center rounded-md bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-3">
            {t["reset_title"]}
          </h1>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">{t["auth_password"]}</span>
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">
              {t["auth_password"]} ({t["common_confirm"]})
            </span>
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
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
            disabled={state === "submitting"}
            type="submit"
          >
            {state === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {state === "submitting" ? "..." : t["reset_submit"]}
          </button>
        </form>
      </div>
    </main>
  );
}
