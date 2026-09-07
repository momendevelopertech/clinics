"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";

type VerifyEmailFormProps = {
  t: Dictionary;
  initialToken: string;
  initialEmail: string;
};

type State = "pending" | "verifying" | "success" | "invalid" | "error";

export function VerifyEmailForm({ t, initialToken, initialEmail }: VerifyEmailFormProps) {
  const [state, setState] = useState<State>(initialToken ? "verifying" : "pending");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!initialToken || !initialEmail) return;

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: initialToken, email: initialEmail }),
        });
        const data = await response.json();

        if (cancelled) return;
        if (response.ok && data?.ok) {
          setState("success");
        } else {
          setState(data?.alreadyVerified ? "success" : "invalid");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [initialToken, initialEmail]);

  async function handleResend() {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: initialEmail }),
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface-panel w-full max-w-md rounded-[36px] border border-white/60 p-10 text-center">
        {state === "verifying" || state === "pending" ? (
          <>
            <div className="mx-auto grid size-16 place-content-center rounded-[20px] bg-primary/10 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
              {t["verify_title"]}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t["verify_pending"]}
            </p>
            {!initialToken ? (
              <div className="mt-8">
                <button
                  onClick={() => void handleResend()}
                  disabled={resending}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 disabled:opacity-60"
                >
                  <MailCheck className="h-4 w-4" />
                  {resending ? "..." : t["verify_resend"]}
                </button>
                {resent ? (
                  <p className="mt-4 text-sm font-medium text-emerald-600">
                    {t["verify_resent"]}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {state === "success" ? (
          <>
            <div className="mx-auto grid size-16 place-content-center rounded-[20px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
              {t["verify_success"]}
            </h1>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20"
              >
                {t["auth_backToLogin"]}
              </Link>
            </div>
          </>
        ) : null}

        {state === "invalid" ? (
          <>
            <div className="mx-auto grid size-16 place-content-center rounded-[20px] bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <XCircle className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
              {t["verify_invalid"]}
            </h1>
            <div className="mt-8">
              <button
                onClick={() => void handleResend()}
                disabled={resending}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 disabled:opacity-60"
              >
                {resending ? "..." : t["verify_resend"]}
              </button>
            </div>
          </>
        ) : null}

        {state === "error" ? (
          <p className="text-sm text-red-600">{t["common_error"]}</p>
        ) : null}
      </div>
    </main>
  );
}