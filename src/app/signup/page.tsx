import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create your clinic" };

export default async function SignupPage() {
  const t = await getDictionary();

  return <SignupForm t={t} />;
}