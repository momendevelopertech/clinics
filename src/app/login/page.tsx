import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/lib/i18n/server";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";
  const error = typeof params.error === "string" ? params.error : null;
  const t = await getDictionary();

  return <LoginForm callbackUrl={callbackUrl} error={error} t={t} />;
}