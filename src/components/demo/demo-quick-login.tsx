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
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary hover:bg-primary/90 px-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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