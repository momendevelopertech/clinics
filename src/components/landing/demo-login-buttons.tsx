"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "Receptionist", email: "ops@acmeclinic.com", password: "admin123" },
  { role: "Owner / Admin", email: "admin@acmeclinic.com", password: "admin123" },
  { role: "Super Admin", email: "superadmin@acmeclinic.com", password: "admin123" },
];

export function DemoLoginButtons() {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  function handleLogin(email: string, password: string) {
    setPendingEmail(email);
    // Server-side redirect (redirect: true): the session cookie and the 302
    // are returned together, so the auth proxy immediately recognizes the
    // session and there is no login<->dashboard redirect loop on Vercel.
    void signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div className="mx-auto mt-3 grid gap-2 sm:grid-cols-3">
      {DEMO_ACCOUNTS.map((account) => (
        <button
          key={account.email}
          onClick={() => handleLogin(account.email, account.password)}
          disabled={pendingEmail !== null}
          className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted disabled:opacity-60 cursor-pointer"
        >
          {pendingEmail === account.email ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <LogIn className="h-3.5 w-3.5 text-primary" />
          )}
          <span className="truncate">{account.role}</span>
        </button>
      ))}
    </div>
  );
}