import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; email?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const t = await getDictionary();

  return (
    <ResetPasswordForm
      t={t}
      initialToken={params.token ?? ""}
      initialEmail={params.email ?? ""}
    />
  );
}