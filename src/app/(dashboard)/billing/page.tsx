import { requireClinicPage } from "@/lib/page-guards";
import BillingPageClient from "./page-client";

// G13: Biller (+Owner bypass) — server guard runs before client shell.
export default async function BillingPage() {
  await requireClinicPage({ roles: ["Biller"] });
  return <BillingPageClient />;
}
