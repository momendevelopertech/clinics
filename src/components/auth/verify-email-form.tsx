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
  const [resendError, setResendError] = useState(false);

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
    setResendError(false);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: initialEmail }),
      });
      if (!response.ok) {
        setResendError(true);
        return;
      }
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-xl">
        {state === "verifying" || state === "pending" ? (
          <>
            <div className="mx-auto grid size-12 place-content-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              {t["verify_title"]}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t["verify_pending"]}
            </p>
            {!initialToken ? (
              <div className="mt-6">
                <button
                  onClick={() => void handleResend()}
                  disabled={resending}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-5 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  <MailCheck className="h-4 w-4" />
                  {resending ? "..." : t["verify_resend"]}
                </button>
                {resent ? (
                  <p className="mt-3 text-xs font-semibold text-success-text">
                    {t["verify_resent"]}
                  </p>
                ) : null}
                {resendError ? (
                  <p className="mt-3 text-xs font-semibold text-critical-text">
                    {t["verify_resendError"]}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {state === "success" ? (
          <>
            <div className="mx-auto grid size-12 place-content-center rounded-full bg-success-bg border border-success/30 text-success-text">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              {t["verify_success"]}
            </h1>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-5 text-xs font-semibold text-primary-foreground transition-colors shadow-xs"
              >
                {t["auth_backToLogin"]}
              </Link>
            </div>
          </>
        ) : null}

        {state === "invalid" ? (
          <>
            <div className="mx-auto grid size-12 place-content-center rounded-full bg-critical-bg border border-critical/30 text-critical-text">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              {t["verify_invalid"]}
            </h1>
            <div className="mt-6">
              <button
                onClick={() => void handleResend()}
                disabled={resending}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-5 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {resending ? "..." : t["verify_resend"]}
              </button>
            </div>
          </>
        ) : null}

        {state === "error" ? (
          <p className="text-xs font-semibold text-critical-text">{t["common_error"]}</p>
        ) : null}
      </div>
    </main>
  );
}