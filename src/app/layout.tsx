import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { getDirAndLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/components/locale/locale-provider";
import { SerwistProvider } from "@serwist/turbopack/react";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-arabic",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const APP_NAME = "Healthcare CRM";
const APP_DEFAULT_TITLE = "Healthcare CRM | Patient, Appointment & Billing Management";
const APP_TITLE_TEMPLATE = "%s | Healthcare CRM";

export const metadata: Metadata = {
  metadataBase: new URL("https://pras75299-openhealthcrm.vercel.app/"),
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
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
  applicationName: APP_NAME,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0D9488" },
    { media: "(prefers-color-scheme: dark)", color: "#0D9488" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, { lang, dir }] = await Promise.all([
    import("@/auth").then(({ auth }) => auth()),
    getDirAndLocale(),
  ]);

  const orgId = session?.user?.organizationId ?? "";

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable} ${jetbrainsMono.variable} min-h-screen antialiased font-sans`}
        suppressHydrationWarning
      >
        <SessionProvider session={session}>
          <SerwistProvider swUrl="/serwist/sw.js">
            <PWAProvider orgId={orgId}>
              <LocaleProvider lang={lang}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                  {children}
                </ThemeProvider>
              </LocaleProvider>
            </PWAProvider>
          </SerwistProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
