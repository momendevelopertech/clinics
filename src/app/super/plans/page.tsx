import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { PlansManager } from "@/components/super/plans-manager";

export const metadata: Metadata = {
  title: "Plan Management",
};

export default async function SuperPlansPage() {
  const t = await getDictionary();
  return (
    <main className="hero-glow min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <PlansManager t={t} />
      </div>
    </main>
  );
}