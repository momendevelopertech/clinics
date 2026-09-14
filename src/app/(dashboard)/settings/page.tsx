import { requireClinicPage } from "@/lib/page-guards";
import SettingsPageClient from "./page-client";

// G13: Owner-only page — server guard runs before any client shell renders.
export default async function SettingsPage() {
  await requireClinicPage({ roles: ["Owner"] });
  return <SettingsPageClient />;
}
