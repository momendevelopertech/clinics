import { requireClinicPage } from "@/lib/page-guards";
import StaffPageClient from "./page-client";

// G13: Owner-only page (staff enumeration risk) — server guard first.
export default async function StaffPage() {
  await requireClinicPage({ roles: ["Owner"] });
  return <StaffPageClient />;
}
