import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  FileText,
  Sparkles,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/server";
import {
  buildPlanHighlights,
  FALLBACK_PLANS,
  formatPrice,
  type PricingPlan,
} from "@/lib/landing/pricing";
import type { Dictionary, Locale } from "@/lib/i18n/locale";

function PlanIcon({ code }: { code: string }) {
  if (code === "free") return <UserRound className="h-5 w-5" />;
  if (code === "clinic") return <FileText className="h-5 w-5" />;
  if (code === "plus") return <CreditCard className="h-5 w-5" />;
  return <Sparkles className="h-5 w-5" />;
}

export async function PlanPricing({ t }: { t: Dictionary }) {
  const lang: Locale = await getLocale();
  let plans: PricingPlan[] = [];
  try {
    const rows = await prisma.plan.findMany({
      where: { status: "active" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        code: true,
        nameEn: true,
        nameAr: true,
        descriptionEn: true,
        descriptionAr: true,
        price: true,
        billingCycle: true,
        popular: true,
        trialDays: true,
        modulesJson: true,
        featuresJson: true,
      },
    });
    const live = rows.map((row) => ({
      code: row.code,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      price: Number(row.price),
      billingCycle: row.billingCycle,
      popular: row.popular,
      trialDays: row.trialDays,
      modulesJson: row.modulesJson,
      featuresJson: row.featuresJson,
    }));
    // Only trust the live catalog when the canonical three are present and
    // carry real display data; otherwise fall back to the static snapshot so
    // marketing always renders cleanly.
    const byCode = new Map(live.map((plan) => [plan.code, plan]));
    const canonicalOk = ["free", "clinic", "plus"].every((code) => {
      const plan = byCode.get(code);
      return (
        plan != null &&
        plan.nameEn.trim().length > 0 &&
        (plan.descriptionEn?.trim().length ?? 0) > 0 &&
        (code === "free" || plan.price > 0)
      );
    });
    plans = canonicalOk ? live : FALLBACK_PLANS;
  } catch {
    plans = FALLBACK_PLANS;
  }

  if (plans.length === 0) plans = FALLBACK_PLANS;

  return (
    <section id="pricing" className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {t["landing_pricingEyebrow"]}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {t["landing_pricingTitle"]}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t["landing_pricingSubtitle"]}
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const highlights = buildPlanHighlights(plan, t);
            const popular = plan.popular;
            return (
              <div
                key={plan.code}
                className={`surface-panel relative flex flex-col rounded-[28px] border p-6 ${
                  popular
                    ? "border-primary/40 shadow-lg shadow-primary/10"
                    : "border-white/55 dark:border-white/6"
                }`}
              >
                {popular ? (
                  <span className="absolute right-5 top-5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {t["landing_pricingPopular"]}
                  </span>
                ) : null}
                <div className="grid size-12 place-content-center rounded-[16px] bg-primary/10 text-primary">
                  <PlanIcon code={plan.code} />
                </div>
                <h3 className="mt-4 text-xl font-semibold">
                  {lang === "ar" ? plan.nameAr : plan.nameEn}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === "ar" ? plan.descriptionAr : plan.descriptionEn}
                </p>
                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    {t["landing_pricingPerMonth"]}
                  </span>
                </p>
                <ul className="mt-5 flex-1 space-y-2">
                  {highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          highlight.unlimited
                            ? "text-amber-500"
                            : "text-emerald-600"
                        }`}
                      />
                      <span className="text-foreground/80">{highlight.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href="/signup"
                    className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-semibold transition hover:translate-y-[-1px] ${
                      plan.code === "free"
                        ? "border border-white/60 bg-white/70 text-foreground shadow-sm hover:bg-white dark:border-white/6 dark:bg-white/[0.04]"
                        : "bg-linear-to-r from-primary to-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                    }`}
                  >
                    {plan.code === "free"
                      ? t["landing_pricingCtaFree"]
                      : t["landing_pricingCtaChoose"].replace(
                          "{plan}",
                          lang === "ar" ? plan.nameAr : plan.nameEn,
                        )}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t["landing_pricingNote"]}
        </p>
      </div>
    </section>
  );
}