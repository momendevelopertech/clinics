import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/lib/i18n/server";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/analytics";
  const t = await getDictionary();

  return <LoginForm callbackUrl={callbackUrl} t={t} />;
}