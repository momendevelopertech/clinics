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
      <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
        <div className="surface-panel w-full max-w-md rounded-[36px] border border-white/60 p-10 text-center">
          <div className="mx-auto grid size-16 place-content-center rounded-[20px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold">{t["reset_success"]}</h1>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20"
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
      <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
        <div className="surface-panel w-full max-w-md rounded-[36px] border border-white/60 p-10 text-center">
          <div className="mx-auto grid size-16 place-content-center rounded-[20px] bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold">{t["reset_invalidToken"]}</h1>
          <div className="mt-8">
            <Link
              href="/forgot-password"
              className="inline-flex h-12 items-center justify-center rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20"
            >
              {t["forgot_title"]}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface-panel w-full max-w-md rounded-[36px] border border-white/60 p-10">
        <div className="space-y-3">
          <div className="grid size-12 place-content-center rounded-[16px] bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
            {t["reset_title"]}
          </h1>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">{t["auth_password"]}</span>
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-13 w-full rounded-[18px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              {t["auth_password"]} ({t["common_confirm"]})
            </span>
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
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