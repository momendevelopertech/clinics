import type { Metadata } from "next";
import { Cairo, IBM_Plex_Mono, Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { getDirAndLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/components/locale/locale-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

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
        className={`${manrope.variable} ${plexMono.variable} ${cairo.variable} min-h-screen antialiased`}
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