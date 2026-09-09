"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { getClientErrorMessage, logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

type PatientQuickLoginProps = {
  email: string;
  mrn: string;
  password: string;
  label: string;
};

export function PatientQuickLogin({
  email,
  mrn,
  password,
  label,
}: PatientQuickLoginProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const handleLogin = async () => {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/patient-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mrn, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || t("portal_loginFailed"));
      }

      toast.success(t("portal_loginSuccess"));
      router.push("/patient-portal");
    } catch (error) {
      toast.error(getClientErrorMessage(error, t("portal_loginFailed")));
      logClientError("Patient quick login failed", error);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] bg-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition hover:translate-y-[-1px] hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      onClick={() => void handleLogin()}
    >
      <LogIn className="h-3.5 w-3.5" />
      {pending ? t("portal_signingIn") : label}
    </button>
  );
}