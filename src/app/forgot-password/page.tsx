import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  const t = await getDictionary();

  return <ForgotPasswordForm t={t} />;
}