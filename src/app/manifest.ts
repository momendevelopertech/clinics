import { cookies } from "next/headers";
import type { MetadataRoute } from "next";
import { isLocale, getDir } from "@/lib/i18n/locale";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const langValue = cookieStore.get("lang")?.value;
  const lang = isLocale(langValue) ? langValue : "en";
  const dir = getDir(lang);

  return {
    name: "Healthcare CRM",
    short_name: "HealthCRM",
    description:
      "Patient, Appointment & Billing Management for Healthcare Clinics",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8f9fa",
    theme_color: "#0891b2",
    lang,
    dir,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["medical", "health", "business"],
    shortcuts: [
      {
        name: lang === "ar" ? "لوحة التحكم" : "Dashboard",
        short_name: lang === "ar" ? "لوحة" : "Dashboard",
        url: "/dashboard",
        description:
          lang === "ar"
            ? "الوصول المباشر للوحة التحكم"
            : "Go directly to the dashboard",
      },
      {
        name: lang === "ar" ? "المرضى" : "Patients",
        short_name: lang === "ar" ? "مرضى" : "Patients",
        url: "/patients",
        description:
          lang === "ar"
            ? "إدارة سجلات المرضى"
            : "Manage patient records",
      },
      {
        name: lang === "ar" ? "المواعيد" : "Appointments",
        short_name: lang === "ar" ? "مواعيد" : "Appts",
        url: "/appointments",
        description:
          lang === "ar"
            ? "إدارة المواعيد"
            : "Manage appointments",
      },
    ],
  };
}
