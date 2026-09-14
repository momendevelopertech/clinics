import Link from "next/link";
import { Activity, ArrowRight, Users } from "lucide-react";
import { auth } from "@/auth";
import { PublicUserStories } from "@/components/user-stories/public-user-stories-client";
import { getDictionary } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/locale/language-switcher";

/**
 * /user-stories — PUBLIC onboarding page (no login required, and logged-in
 * users are welcome too: no forced redirect, the header just adapts).
 * Renders the human-only projection of the roles guide: everyday language,
 * per-role stories, live plan data when logged in — zero API/file jargon.
 */
export default async function UserStoriesPage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);
  const roles = session?.user?.roles ?? [];
  const dashboardHref = roles.includes("Super Admin") ? "/super" : "/dashboard";
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

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                {t["nav_dashboard"]}
              </Link>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-16 sm:px-6 lg:pt-20">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
            <Users className="h-3.5 w-3.5" />
            {t["userStories_badge"]}
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl">
            {t["userStories_title"]}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            {t["userStories_subtitle"]}
          </p>
        </div>
      </section>

      {/* Onboarding guide: role stories + search + everyday tasks */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <PublicUserStories />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="surface-panel mx-auto max-w-4xl rounded-lg border border-border p-8 text-center shadow-sm">
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">
            {t["userStories_ctaTitle"]}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {t["userStories_ctaBody"]}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                {t["nav_dashboard"]}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  {t["userStories_ctaSignup"]}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  {t["userStories_ctaLogin"]}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
