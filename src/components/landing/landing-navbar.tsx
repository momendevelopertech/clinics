"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Menu, X } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { LanguageSwitcher } from "@/components/locale/language-switcher";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { key: "landing_navFeatures", href: "#features" },
  { key: "landing_navHowItWorks", href: "#how-it-works" },
  { key: "landing_navPricing", href: "#pricing" },
  { key: "landing_clinicsTitle", href: "#clinics" },
  { key: "landing_demoTitle", href: "#demo" },
  { key: "landing_navUsers", href: "/user-stories" },
];

export function LandingNavbar({
  isLoggedIn,
  dashboardHref,
}: {
  isLoggedIn: boolean;
  dashboardHref: string;
}) {
  const { t, dir } = useLocale();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isRtl = dir === "rtl";
  const actionHref = isLoggedIn ? dashboardHref : "/signup";
  const actionLabel = isLoggedIn ? t("nav_dashboard") : t("landing_navStartFree");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function closeOnDesktop() {
    if (window.innerWidth >= 768) setOpen(false);
  }
  useEffect(() => {
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md transition-shadow duration-200",
        scrolled ? "border-border shadow-md" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo — inline-start */}
        <div className="flex min-w-0 flex-1 items-center">
          <Link href="/" className="flex items-center gap-2" aria-label={t("appName")}>
            <div className="grid size-9 shrink-0 place-content-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <span className="hidden truncate text-lg font-semibold tracking-tight rtl:tracking-normal sm:inline">
              {t("appName")}
            </span>
          </Link>
        </div>

        {/* Center links — desktop only */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex" aria-label={t("landing_navFeatures")}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="rounded-md transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        {/* Actions — inline-end */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <LanguageSwitcher compact />
          {isLoggedIn ? (
            <Link
              href={dashboardHref}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("nav_dashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              >
                {t("landing_navSignIn")}
              </Link>
<Link
                href="/signup"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("landing_navStartFree")}
              </Link>
            </>
          )}
          {/* Hamburger — below md */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={t("landing_navMenu")}
            onClick={() => setOpen(true)}
            className="grid size-9 shrink-0 place-content-center rounded-lg border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ============================================================
          Component: MobileDrawer
          ============================================================ */}
      <div
        id="landing-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        inert={!open}
        className={cn("fixed inset-0 z-[60] md:hidden", !open && "pointer-events-none")}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-foreground/50 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        {/* Panel */}
        <div
          className="absolute inset-y-0 flex w-[min(20rem,86vw)] flex-col bg-card shadow-2xl transition-transform duration-300 ease-out"
          style={{
            insetInlineEnd: 0,
            transform: open ? "translateX(0)" : `translateX(${isRtl ? "-100%" : "100%"})`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-content-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold tracking-tight rtl:tracking-normal">{t("appName")}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("landing_navMenuClose")}
              className="grid size-9 place-content-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t("landing_navFeatures")}>
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t(link.key)}
                    <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-border px-5 py-5">
            <Link
              href={actionHref}
              onClick={() => setOpen(false)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            {!isLoggedIn ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                {t("landing_navSignIn")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}