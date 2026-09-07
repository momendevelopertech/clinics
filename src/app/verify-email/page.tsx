import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Verify email" };

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string; email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const t = await getDictionary();

  return (
    <VerifyEmailForm
      t={t}
      initialToken={params.token ?? ""}
      initialEmail={params.email ?? ""}
    />
  );
}