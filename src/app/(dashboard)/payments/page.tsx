import { requireClinicPage } from "@/lib/page-guards";
import PaymentsPageClient from "./page-client";

// G13: Biller (+Owner bypass) — server guard runs before client shell.
export default async function PaymentsPage() {
  await requireClinicPage({ roles: ["Biller"] });
  return <PaymentsPageClient />;
}
