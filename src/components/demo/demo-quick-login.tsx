"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

type DemoQuickLoginProps = {
  email: string;
  password: string;
  label: string;
};

export function DemoQuickLogin({ email, password, label }: DemoQuickLoginProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] bg-linear-to-r from-primary to-cyan-500 px-3 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("credentials", {
          email,
          password,
          redirect: true,
          callbackUrl: "/dashboard",
        });
      }}
      type="button"
    >
      <LogIn className="h-3.5 w-3.5" />
      {pending ? "…" : label}
    </button>
  );
}