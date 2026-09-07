import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { getDirAndLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/components/locale/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pras75299-openhealthcrm.vercel.app/"),
  title: {
    default: "Healthcare CRM | Patient, Appointment & Billing Management",
    template: "%s | Healthcare CRM",
  },
  description:
    "Healthcare CRM for managing patients, appointments, encounters, prescriptions, billing, inventory, communications, and analytics in one platform.",
  keywords: [
    "Healthcare CRM",
    "Patient management software",
    "Appointment scheduling system",
    "Medical billing software",
    "Clinic management system",
    "Electronic medical records",
    "Healthcare analytics",
    "Prescription management",
  ],
  applicationName: "Healthcare CRM",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang, dir } = await getDirAndLocale();

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body
        className="min-h-screen antialiased"
        suppressHydrationWarning
      >
        <LocaleProvider lang={lang}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}