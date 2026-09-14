import { requireClinicPage } from "@/lib/page-guards";
import IntegrationsPageClient from "./page-client";

// G13: Owner-only page — server guard runs before any client shell renders.
export default async function IntegrationsPage() {
  await requireClinicPage({ roles: ["Owner"] });
  return <IntegrationsPageClient />;
}
