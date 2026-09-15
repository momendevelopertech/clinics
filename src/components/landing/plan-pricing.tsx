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
    <section id="pricing" className="px-4 pb-16 sm:px-6 md:pb-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm">
            {t["landing_pricingEyebrow"]}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] rtl:tracking-normal sm:text-4xl">
            {t["landing_pricingTitle"]}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t["landing_pricingSubtitle"]}
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const highlights = buildPlanHighlights(plan, t);
            const popular = plan.popular;
            return (
              <div
                key={plan.code}
                className={
                  popular
                    ? "surface-panel relative flex flex-col rounded-2xl border-2 border-primary p-6 shadow-lg transition-shadow duration-200 lg:scale-[1.02]"
                    : "surface-panel relative flex flex-col rounded-2xl border border-border p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                }
              >
                {popular ? (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    {t["landing_pricingPopular"]}
                  </span>
                ) : null}
                <div className="grid size-11 place-content-center rounded-lg bg-primary/10 text-primary">
                  <PlanIcon code={plan.code} />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {lang === "ar" ? plan.nameAr : plan.nameEn}
                </h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {lang === "ar" ? plan.descriptionAr : plan.descriptionEn}
                </p>
                <p className="mt-4 text-3xl font-semibold tracking-tight rtl:tracking-normal">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    {t["landing_pricingPerMonth"]}
                  </span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          highlight.unlimited
                            ? "text-warning-text"
                            : "text-success-text"
                        }`}
                      />
                      <span className="text-foreground">{highlight.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-5">
                  <Link
                    href="/signup"
                    className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      plan.code === "free"
                        ? "border border-border bg-card text-foreground shadow-sm hover:bg-muted"
                        : "bg-primary text-primary-foreground shadow-sm"
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