import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  IndianRupee,
  Package,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { getDictionary } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/locale/language-switcher";
import { DemoLoginButtons } from "@/components/landing/demo-login-buttons";
import { AppPreview } from "@/components/landing/app-preview";
import { ClinicShowcase } from "@/components/landing/clinic-showcase";
import { PlanPricing } from "@/components/landing/plan-pricing";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const t = await getDictionary();

  return (
    <main className="min-h-screen">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
        <div className="surface-panel mx-auto flex h-16 max-w-6xl items-center justify-between rounded-lg border border-border px-4 sm:px-6 shadow-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid size-9 place-content-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">{t["appName"]}</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              {t["landing_navFeatures"]}
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              {t["landing_navHowItWorks"]}
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              {t["landing_navPricing"]}
            </a>
            <a href="#clinics" className="transition-colors hover:text-foreground">
              {t["landing_clinicsTitle"]}
            </a>
            <a href="#demo" className="transition-colors hover:text-foreground">
              {t["landing_demoTitle"]}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary sm:block"
            >
              {t["landing_navSignIn"]}
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {t["landing_navStartFree"]}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-16 sm:px-6 lg:pt-24">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
            <HeartPulse className="h-3.5 w-3.5" />
            {t["landing_badge"]}
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">
            {t["landing_heroTitle"]}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            {t["landing_heroSubtitle"]}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {t["landing_heroCta"]}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
            >
              {t["landing_heroCtaSecondary"]}
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-14 grid gap-3 rounded-lg border border-border surface-panel p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Trophy, value: "3+", label: t["landing_statsClinics"] },
              { icon: Users, value: "7+", label: t["landing_statsDoctors"] },
              { icon: ClipboardList, value: "60+", label: t["landing_statsPatients"] },
              { icon: CalendarCheck2, value: "200+", label: t["landing_statsAppointments"] },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-center gap-3">
                <div className="grid size-11 place-content-center rounded-md bg-primary/10 text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-semibold leading-none">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Product preview (CSS screenshot) */}
          <AppPreview t={t} />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {t["landing_howTitle"]}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: t["landing_how1Title"], body: t["landing_how1Body"] },
              { step: "02", title: t["landing_how2Title"], body: t["landing_how2Body"] },
              { step: "03", title: t["landing_how3Title"], body: t["landing_how3Body"] },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-lg border border-border surface-panel p-6 shadow-sm"
              >
                <p className="font-mono text-sm font-semibold text-primary">{item.step}</p>
                <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {t["landing_featuresTitle"]}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: CalendarCheck2, title: t["landing_feature_scheduling"], body: t["landing_feature_schedulingBody"] },
              { icon: ClipboardList, title: t["landing_feature_emr"], body: t["landing_feature_emrBody"] },
              { icon: Wallet, title: t["landing_feature_billing"], body: t["landing_feature_billingBody"] },
              { icon: Package, title: t["landing_feature_inventory"], body: t["landing_feature_inventoryBody"] },
              { icon: BarChart3, title: t["landing_feature_reports"], body: t["landing_feature_reportsBody"] },
              { icon: ShieldCheck, title: t["landing_feature_multiTenant"], body: t["landing_feature_multiTenantBody"] },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border surface-panel p-6 shadow-sm"
              >
                <div className="grid size-11 place-content-center rounded-md bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PlanPricing t={t} />

      {/* Our clinics */}
      <section id="clinics" className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {t["landing_clinicsEyebrow"]}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {t["landing_clinicsTitle"]}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {String(t["landing_clinicsSubtitle"]).replace("{appName}", String(t["appName"] ?? "OpenHealthCRM"))}
            </p>
          </div>
          <ClinicShowcase t={t} />
        </div>
      </section>

      {/* Demo accounts */}
      <section id="demo" className="px-4 pb-24 sm:px-6">
        <div className="surface-panel mx-auto max-w-4xl rounded-lg border border-border p-8 text-center shadow-sm">
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">{t["landing_demoTitle"]}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t["landing_demoNote"]}</p>
          <DemoLoginButtons />
          <Link
            href="/demo-accounts"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            {t["landing_viewDemo"]}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <IndianRupee className="h-4 w-4" />
            <FlaskConical className="h-4 w-4" />
            <span>{t["landing_footerTagline"]}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-content-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-foreground">{t["appName"]}</span>
          </div>
          <p>{t["landing_footerTagline"]}</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">{t["landing_navSignIn"]}</Link>
            <Link href="/signup" className="hover:text-foreground">{t["landing_navStartFree"]}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}