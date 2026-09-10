import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/roles";
import { getDictionary } from "@/lib/i18n/server";
import { SuperClinicDetail } from "@/components/super/super-clinic-detail";

export default async function SuperClinicDetailPage() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    redirect("/login?callbackUrl=/super");
  }

  const t = await getDictionary();
  return (
    <main className="hero-glow min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SuperClinicDetail t={t} />
      </div>
    </main>
  );
}