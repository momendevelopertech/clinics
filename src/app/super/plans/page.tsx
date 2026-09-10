import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/roles";
import { getDictionary } from "@/lib/i18n/server";
import { PlansManager } from "@/components/super/plans-manager";

export const metadata: Metadata = {
  title: "Plan Management",
};

export default async function SuperPlansPage() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    redirect("/login?callbackUrl=/super/plans");
  }

  const t = await getDictionary();
  return (
    <main className="hero-glow min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <PlansManager t={t} />
      </div>
    </main>
  );
}