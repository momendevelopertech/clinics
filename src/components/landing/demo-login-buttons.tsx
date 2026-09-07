"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "Receptionist", email: "ops@acmeclinic.com", password: "admin123" },
  { role: "Owner / Admin", email: "admin@acmeclinic.com", password: "admin123" },
  { role: "Super Admin", email: "superadmin@acmeclinic.com", password: "admin123" },
];

export function DemoLoginButtons() {
  const router = useRouter();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleLogin(email: string, password: string) {
    setPendingEmail(email);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/analytics",
    });
    setPendingEmail(null);

    if (result?.ok) {
      router.push("/analytics");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
      {DEMO_ACCOUNTS.map((account) => (
        <button
          key={account.email}
          onClick={() =>
            void handleLogin(account.email, account.password)
          }
          disabled={pendingEmail !== null}
          className="flex items-center justify-center gap-2 rounded-[18px] border border-white/60 bg-white/70 px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-white dark:border-white/6 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] disabled:opacity-60"
        >
          {pendingEmail === account.email ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {account.role}
        </button>
      ))}
    </div>
  );
}