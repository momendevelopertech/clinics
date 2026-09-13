"use client";

import { Fragment, useMemo, useState } from "react";
import { Check, CreditCard, Loader2, Lock, Sparkles, TrendingUp, UserRound, Zap, FileText } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import type { LimitUsage, UsageSnapshot } from "@/lib/entitlements/types";
import { MODULE_GROUPS } from "@/lib/entitlements/catalog";

type PlanCardDto = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  price: number;
  popular: boolean;
  trialDays: number;
};

type CompareRow = {
  code: string;
  labelKey: string;
  group: string;
  premium?: boolean;
  type: "module" | "limit" | "feature";
  values: (boolean | number | null)[];
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
    subscriptionStatus: string | null;
    subscriptionEndsAt: string | null;
  };
  currentPlan: { code: string; name: string; price: number; trialDays: number; description: string };
  nextPlan: { code: string; name: string; price: number } | null;
  limitUsage: LimitUsage[];
  usage: UsageSnapshot;
  plans: PlanCardDto[];
  compareRows: CompareRow[];
  isOwner: boolean;
  lockModule: string | null;
};

const LIMIT_LABELS: Record<string, keyof Dictionary> = {
  patients: "mtr_patients",
  staff: "mtr_staff",
  doctors: "mtr_doctors",
  appointments_month: "mtr_appointments",
  storage_gb: "mtr_storage",
};

function formatPrice(price: number) {
  return price === 0 ? "$0" : `$${price.toLocaleString()}`;
}

function formatLimit(value: number | null) {
  if (value == null || value >= 999_999) return "∞";
  return value.toLocaleString();
}

function UsageBar({ entry, t }: { entry: LimitUsage; t: Dictionary }) {
  const { key, used, limit, unlimited, percent, nearLimit } = entry;
  const labelKey = (LIMIT_LABELS[key] ?? ("mtr_" + key) as keyof Dictionary);
  const label = t[labelKey] ?? key;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {unlimited ? "∞" : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            percent >= 90 ? "bg-critical-text" : percent >= 70 ? "bg-warning-text" : "bg-success-text"
          }`}
          style={{ width: `${unlimited ? 0 : percent}%` }}
        />
      </div>
      {unlimited ? null : nearLimit ? (
        <p className="text-xs font-medium text-warning-text">
          {t["upg_nearLimit"].replace("{used}", used.toLocaleString()).replace("{limit}", limit.toLocaleString()).replace("{percent}", String(percent))}
        </p>
      ) : null}
    </div>
  );
}

function HighlightIcon({ code }: { code: string }) {
  if (code === "free") return <UserRound className="h-5 w-5" />;
  if (code === "clinic") return <FileText className="h-5 w-5" />;
  if (code === "plus") return <CreditCard className="h-5 w-5" />;
  return <Sparkles className="h-5 w-5" />;
}

export function PlanDashboard({
  t,
  org,
  currentPlan,
  nextPlan,
  limitUsage,
  usage,
  plans,
  compareRows,
  isOwner,
  lockModule,
}: PlanDashboardProps) {
  const [note, setNote] = useState("");
  const [targetPlan, setTargetPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const hasPendingUpgrade = Boolean(org.upgradeRequestedPlan);

  const nearLimitEntries = useMemo(
    () => limitUsage.filter((entry) => entry.nearLimit && !entry.unlimited),
    [limitUsage],
  );

  const recommendation = useMemo(() => {
    if (!nextPlan) return null;
    const plansByCode = plans.find((plan) => plan.code === nextPlan.code);
    return {
      code: nextPlan.code,
      name: nextPlan.name,
      price: nextPlan.price,
      currentPrice: currentPlan.price,
      planCount: plansByCode ? 1 : 0,
      lockedFeature: lockModule ? formatLockLabel(lockModule, t) : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextPlan, t, lockModule]);

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

  const compareGroups = useMemo(() => {
    const grouped: Array<{ group: string; rows: CompareRow[] }> = [];
    const order = ["overview", "clinical", "operations", "billing", "growth", "system"];
    for (const group of order) {
      const rows = compareRows.filter((row) => row.group === group);
      if (rows.length > 0) grouped.push({ group, rows });
    }
    return grouped;
  }, [compareRows]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t["plan_title"]}</h1>
        <p className="text-sm text-muted-foreground">{t["plan_subtitle"]}</p>
      </div>

      {/* Header: current plan + usage */}
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-lg border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t["plan_currentPlan"]}
            </p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {currentPlan.name}
            </span>
          </div>
          {hasPendingUpgrade ? (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-accent-blue-text/20 bg-accent-blue-bg p-3 text-sm text-accent-blue-text">
              <Zap className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {t["plan_upgradeRequested"]} ·{" "}
                {org.upgradeRequestedPlan
                  ? plans.find((p) => p.code === org.upgradeRequestedPlan)?.name ?? org.upgradeRequestedPlan
                  : ""}
                {org.upgradeRequestedAt ? ` · ${new Date(org.upgradeRequestedAt).toLocaleDateString()}` : ""}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {currentPlan.description || t["plan_subtitle"]} — {formatPrice(currentPlan.price)}/mo
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">{t["upg_price"]}</dt>
              <dd className="mt-1 text-lg font-semibold">{formatPrice(currentPlan.price)}<span className="text-xs font-normal text-muted-foreground">/mo</span></dd>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">{t["upg_status"]}</dt>
              <dd className="mt-1 text-sm font-semibold capitalize">
                {org.subscriptionStatus ? t[`sub_status${org.subscriptionStatus}` as keyof Dictionary] ?? org.subscriptionStatus : t["sub_statusactive"]}
              </dd>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">{t["upg_patients"]}</dt>
              <dd className="mt-1 text-lg font-semibold">{usage.patients.toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <div className="surface-panel rounded-lg border border-border p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {t["plan_usage"]}
          </p>
          <div className="mt-4 space-y-4">
            {limitUsage.map((entry) => (
              <UsageBar key={entry.key} entry={entry} t={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Next plan recommendation */}
      {recommendation && nextPlan && !hasPendingUpgrade ? (
        <div className={`rounded-lg border p-6 ${
          lockModule ? "border-primary/50 bg-primary/5 shadow-sm"
            : "border-border bg-muted/30"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-content-center rounded-md bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t["upg_recommended"]}
                </p>
                <p className="text-xl font-semibold">
                  {t["upg_nextPlan"].replace("{plan}", recommendation.name)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {nearLimitEntries.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t["upg_limitTip"].replace("{count}", String(nearLimitEntries.length))}
                </p>
              ) : recommendation.lockedFeature ? (
                <p className="text-sm font-medium text-warning-text">
                  {recommendation.lockedFeature} <Lock className="inline h-3.5 w-3.5" />
                </p>
              ) : null}
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold">
                {formatPrice(recommendation.price)}/mo
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-critical-text/20 bg-critical-bg px-4 py-3 text-sm text-critical-text">
          {error}
        </p>
      ) : null}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = org.plan === plan.code;
          const isRecommended = nextPlan?.code === plan.code;
          const disabled = isCurrent || hasPendingUpgrade || (!isOwner && !sent) || submitting;
          const highlights: string[] = [];
          const col = plans.findIndex((p) => p.code === plan.code);
          if (col >= 0) {
            for (const row of compareRows) {
              const value = row.values[col];
              if (row.type === "limit" && typeof value === "number") {
                highlights.push(`${t[row.labelKey as keyof Dictionary]}: ${formatLimit(value)}`);
              } else if (row.type === "feature" && value === true) {
                highlights.push(t[row.labelKey as keyof Dictionary]);
              }
            }
            const premiumMissing = compareRows.filter(
              (row) => row.premium && row.values[col] === false,
            );
            for (const row of premiumMissing.slice(0, 3)) {
              highlights.push(
                `${t["upg_availableIn"].replace("{plan}", nextPlan?.name ?? plan.name)} — ${t[row.labelKey as keyof Dictionary]}`,
              );
            }
          }

          return (
            <div
              key={plan.code}
              className={`surface-panel relative rounded-lg border p-6 shadow-sm ${
                isRecommended
                  ? "border-primary/50 shadow-md"
                  : "border-border"
              }`}
            >
              {isCurrent ? (
                <span className="absolute right-4 top-4 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success-text">
                  {t["plan_onThisPlan"]}
                </span>
              ) : isRecommended ? (
                <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {t["upg_recommended"]}
                </span>
              ) : null}

              <div className="grid size-11 place-content-center rounded-md bg-primary/10 text-primary">
                <HighlightIcon code={plan.code} />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {formatPrice(plan.price)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              {plan.trialDays > 0 ? (
                <p className="mt-1 text-xs font-medium text-accent-blue-text">
                  {t["upg_trialDays"].replace("{days}", String(plan.trialDays))}
                </p>
              ) : null}
              <ul className="mt-5 space-y-2">
                {highlights.map((highlight, index) => {
                  const isLocked = highlight.startsWith(t["upg_availableIn"]);
                  return (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      {isLocked ? (
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" />
                      ) : (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-text" />
                      )}
                      <span className={isLocked ? "text-warning-text" : "text-foreground/90"}>
                        {highlight}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="h-9 w-full rounded-md border border-border bg-muted/50 text-sm font-medium text-muted-foreground"
                  >
                    {t["plan_onThisPlan"]}
                  </button>
                ) : isOwner ? (
                  <button
                    disabled={disabled}
                    onClick={() => {
                      void requestUpgrade(plan.code);
                    }}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && targetPlan === plan.code ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {t["plan_upgrade"]}
                  </button>
                ) : (
                  <button
                    disabled
                    className="h-9 w-full rounded-md border border-border bg-muted/50 text-sm font-medium text-muted-foreground"
                  >
                    {t["plan_onThisPlan"]}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compare table */}
      <div className="surface-panel overflow-hidden rounded-lg border border-border shadow-sm">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold">{t["upg_compareTitle"]}</h2>
          <p className="text-sm text-muted-foreground">{t["upg_compareSubtitle"]}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground bg-muted/30">
                <th className="px-6 py-3">{t["upg_feature"]}</th>
                {plans.map((plan) => (
                  <th key={plan.code} className={`px-4 py-3 text-center ${plan.code === org.plan ? "text-primary font-semibold" : ""}`}>
                    {plan.name}
                    {plan.code === org.plan ? <span className="block text-[10px] font-semibold normal-case">{t["plan_onThisPlan"]}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {compareGroups.map(({ group, rows }) => (
                <Fragment key={group}>
                  <tr className="bg-muted/40">
                    <td className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground" colSpan={plans.length + 1}>
                      {t[MODULE_GROUPS[group] as keyof Dictionary] ?? group}
                    </td>
                  </tr>
                  {rows.map((row) => {
                    const col = plans.findIndex((p) => p.code === org.plan);
                    const currentValue = col >= 0 ? row.values[col] : undefined;
                    const rowLocked =
                      row.premium && currentValue === false && (row.type === "feature" || row.type === "module");
                    return (
                      <tr key={`${group}-${row.code}`} className="hover:bg-muted/30">
                        <td className="px-6 py-2.5 font-medium text-foreground">
                          <span className="inline-flex items-center gap-2">
                            {t[row.labelKey as keyof Dictionary]}
                            {rowLocked ? <Lock className="h-3 w-3 text-warning-text" /> : null}
                          </span>
                        </td>
                        {row.values.map((value, index) => {
                          const isCurrentCol = plans[index]?.code === org.plan;
                          return (
                            <td key={index} className={`px-4 py-2.5 text-center ${isCurrentCol ? "text-primary font-medium" : ""}`}>
                              {row.type === "module" ? (
                                value === true ? (
                                  <Check className="mx-auto h-4 w-4 text-success-text" />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )
                              ) : row.type === "limit" ? (
                                typeof value === "number" ? (
                                  <span className="font-semibold">{formatLimit(value)}</span>
                                ) : (
                                  <span className="font-semibold text-success-text">∞</span>
                                )
                              ) : value === true ? (
                                <Check className="mx-auto h-4 w-4 text-success-text" />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isOwner ? (
        <div className="surface-panel rounded-lg border border-border p-5 shadow-sm">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">{t["plan_upgradeNote"]}</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      ) : null}

      {sent ? (
        <p className="rounded-md border border-success-text/20 bg-success-bg px-4 py-3 text-sm font-medium text-success-text">
          {t["plan_upgradeSent"]}
        </p>
      ) : null}
    </div>
  );
}

function formatLockLabel(moduleKey: string, t: Dictionary): string | null {
  const key = (`nav_${moduleKey}`) as keyof Dictionary;
  const label = t[key] ?? moduleKey;
  return label;
}