import Link from "next/link";
import { Activity, ArrowRight, Users } from "lucide-react";
import { RolesGuideClient } from "@/components/roles-guide/roles-guide-client";
import { getDictionary } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/locale/language-switcher";

/**
 * /user-stories — PUBLIC interactive User Stories page (no login required).
 * Full guide experience (role sidebar + search + accordion tasks) over the
 * same ROLES_GUIDE data as the internal /roles-guide page, minus
 * platform-internal content: the Super Admin role and the "backend"
 * implementation row stay exclusive to /roles-guide (Owner + Super Admin).
 */
export default async function UserStoriesPage() {
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

      {/* Interactive guide: role sidebar + search + accordion tasks */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <RolesGuideClient hiddenRoleIds={["super-admin"]} hideBackend />
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
          </div>
        </div>
      </section>
    </main>
  );
}
