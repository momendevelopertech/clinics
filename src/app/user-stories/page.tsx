import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  Crown,
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import { ROLES_GUIDE, getRoleModules } from "@/lib/roles-guide-data";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/locale/language-switcher";

const ROLE_ICONS: Record<string, React.ElementType> = {
  Crown,
  Stethoscope,
  HeartPulse,
  Bell,
  Wallet,
  Pill,
  Users,
  ShieldCheck,
};

/**
 * /user-stories — PUBLIC marketing page (no login required).
 * Shows a safe marketing subset of ROLES_GUIDE: role name, profile,
 * available-module count, and sample task titles.
 * Internal details (backend behavior, file paths, boundaries) and the
 * Super Admin role stay exclusive to the guarded /roles-guide page.
 */
export default async function UserStoriesPage() {
  const t = await getDictionary();
  const lang = await getLocale();

  // Super Admin is platform-internal — never marketed on the public page.
  const roles = ROLES_GUIDE.filter((r) => r.id !== "super-admin");

  return (
    <main className="min-h-screen">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
        <div className="surface-panel mx-auto flex h-16 max-w-6xl items-center justify-between rounded-[22px] border border-white/55 px-4 sm:px-6 dark:border-white/6">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid size-9 place-content-center rounded-[14px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
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
              className="rounded-[14px] bg-linear-to-r from-primary to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px]"
            >
              {t["landing_navStartFree"]}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-16 sm:px-6 lg:pt-20">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary shadow-sm dark:border-white/6 dark:bg-white/[0.04]">
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

      {/* Role cards */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role.icon] ?? Users;
            const modules = getRoleModules(role);
            const available = modules.filter((m) => m.available).length;
            const sampleTasks = role.tasks.slice(0, 4);
            return (
              <article
                key={role.id}
                className="rounded-[28px] border border-white/55 surface-panel p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-12 shrink-0 place-content-center rounded-[16px] bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{role.name[lang]}</h2>
                    <p className="text-xs font-medium text-muted-foreground">
                      {available} · {t["userStories_modules"]}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {role.profile[lang]}
                </p>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t["userStories_sampleTasks"]}
                </h3>
                <ul className="mt-3 space-y-2">
                  {sampleTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 grid size-5 shrink-0 place-content-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="leading-6">{task.title[lang]}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="surface-panel mx-auto max-w-4xl rounded-[36px] border border-white/55 p-10 text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">
            {t["userStories_ctaTitle"]}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {t["userStories_ctaBody"]}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px]"
            >
              {t["userStories_ctaSignup"]}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-[18px] border border-white/60 bg-white/70 px-6 text-sm font-semibold text-foreground shadow-sm transition hover:bg-white dark:border-white/6 dark:bg-white/[0.04]"
            >
              {t["userStories_ctaLogin"]}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
