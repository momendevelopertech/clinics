"use client";

import { useState } from "react";
import { Check, CreditCard, FileText, Loader2, UserRound, Zap } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";

type PlanCard = {
  id: "free" | "clinic" | "plus";
  name: string;
  tagline: string;
  price: string;
  features: string[];
  highlighted?: boolean;
};

type PlanDashboardProps = {
  t: Dictionary;
  org: {
    id: string;
    plan: string;
    status: string;
    upgradeRequestedPlan: string | null;
    upgradeRequestedAt: string | null;
    upgradeNote: string | null;
  };
  usage: { patients: number; staff: number; appointments: number };
  limits: { patients: number; staff: number; appointments: number };
  isOwner: boolean;
};

const PLAN_DETAILS: Record<string, { tagline: string; price: string; features: string[] }> = {
  free: {
    tagline: "For clinics getting started",
    price: "$0",
    features: ["50 patients", "2 staff accounts", "200 appointments/mo", "Reception desk"],
  },
  clinic: {
    tagline: "For growing practices",
    price: "$99",
    features: ["500 patients", "10 staff accounts", "5,000 appointments/mo", "Billing + reports", "Email reminders"],
  },
  plus: {
    tagline: "For multi-location groups",
    price: "$249",
    features: ["Unlimited patients", "Unlimited staff", "Unlimited appointments", "Priority support", "Everything in Clinic"],
  },
};

function UsageBar({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()} / {total === 999_999 ? "∞" : total.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70 dark:bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${
            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanDashboard({ t, org, usage, limits, isOwner }: PlanDashboardProps) {
  const planNameKey = `plan_${org.plan}PlanName` as keyof Dictionary;
  const currentPlanName = t[planNameKey];

  const [note, setNote] = useState("");
  const [targetPlan, setTargetPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const hasPendingUpgrade = Boolean(org.upgradeRequestedPlan);

  async function requestUpgrade(plan: string) {
    if (!isOwner || hasPendingUpgrade) return;
    setTargetPlan(plan);
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/org/request-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, note }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? t["common_error"]);
        return;
      }
      setSent(true);
    } catch {
      setError(t["common_error"]);
    } finally {
      setSubmitting(false);
    }
  }

  const planCards: PlanCard[] = (["free", "clinic", "plus"] as const).map((id) => ({
    id,
    name: t[`plan_${id}PlanName` as keyof Dictionary],
    ...PLAN_DETAILS[id],
    highlighted: id === "clinic" || (org.plan === "plus" && id === "plus"),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t["plan_title"]}</h1>
        <p className="text-sm text-muted-foreground">{t["plan_subtitle"]}</p>
      </div>

      {/* Current plan + usage */}
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t["plan_currentPlan"]}
            </p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {currentPlanName}
            </span>
          </div>
          {hasPendingUpgrade ? (
            <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-cyan-200 bg-cyan-50/70 p-3 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/8 dark:text-cyan-200">
              <Zap className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {t["plan_upgradeRequested"]}
                {" · "}
                {org.upgradeRequestedPlan
                  ? t[`plan_${org.upgradeRequestedPlan}PlanName` as keyof Dictionary]
                  : ""}
                {org.upgradeRequestedAt
                  ? ` · ${new Date(org.upgradeRequestedAt).toLocaleDateString()}`
                  : ""}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {PLAN_DETAILS[org.plan].tagline} — {PLAN_DETAILS[org.plan].price}/mo
            </p>
          )}
        </div>

        <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {t["plan_usage"]}
          </p>
          <div className="mt-4 space-y-4">
            <UsageBar label={`${t["plan_patients"]} (${t["plan_of"]} ${limits.patients})`} used={usage.patients} total={limits.patients} />
            <UsageBar label={`${t["plan_staff"]} (${t["plan_of"]} ${limits.staff})`} used={usage.staff} total={limits.staff} />
            <UsageBar label={`${t["plan_appointments"]} (${t["plan_of"]} ${limits.appointments})`} used={usage.appointments} total={limits.appointments} />
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {planCards.map((plan) => {
          const isCurrent = org.plan === plan.id;
          const disabled = isCurrent || hasPendingUpgrade || (!isOwner && !sent) || submitting;

          return (
            <div
              key={plan.id}
              className={`surface-panel relative rounded-[28px] border p-6 ${
                plan.highlighted ? "border-primary/40 shadow-lg shadow-primary/5" : "border-white/55 dark:border-white/6"
              }`}
            >
              {isCurrent ? (
                <span className="absolute right-4 top-4 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {t["plan_onThisPlan"]}
                </span>
              ) : null}

              <div className="grid size-12 place-content-center rounded-[16px] bg-primary/10 text-primary">
                {plan.id === "free" ? <UserRound className="h-5 w-5" /> : plan.id === "clinic" ? <FileText className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              </div>
              <h2 className="mt-4 text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground"> /mo</span>
              </p>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="h-11 w-full rounded-[16px] border border-white/60 bg-white/60 text-sm font-semibold text-muted-foreground dark:border-white/6 dark:bg-white/[0.03]"
                  >
                    {t["plan_onThisPlan"]}
                  </button>
                ) : isOwner ? (
                  <button
                    disabled={disabled}
                    onClick={() => {
                      void requestUpgrade(plan.id);
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && targetPlan === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {t["plan_upgrade"]}
                  </button>
                ) : (
                  <button
                    disabled
                    className="h-11 w-full rounded-[16px] border border-white/60 bg-white/60 text-sm font-semibold text-muted-foreground dark:border-white/6 dark:bg-white/[0.03]"
                  >
                    {t["plan_onThisPlan"]}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isOwner ? (
        <div className="surface-panel rounded-[24px] border border-white/55 p-5 dark:border-white/6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">{t["plan_upgradeNote"]}</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="w-full rounded-[16px] border border-border bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
            />
          </label>
        </div>
      ) : null}

      {sent ? (
        <p className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
          {t["plan_upgradeSent"]}
        </p>
      ) : null}
    </div>
  );
}