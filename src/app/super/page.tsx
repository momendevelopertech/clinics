import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/roles";
import { getDictionary } from "@/lib/i18n/server";
import { SuperConsole } from "@/components/super/super-console";

export const metadata = { title: "Platform Admin Console" };

export default async function SuperPage() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    redirect("/login");
  }

  const t = await getDictionary();

  return <SuperConsole t={t} />;
}