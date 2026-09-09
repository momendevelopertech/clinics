"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Check,
  DollarSign,
  Loader2,
  Minus,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import type { LimitUsage } from "@/lib/entitlements/types";

type DetailPayload = {
  org: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    plan: string;
    onboardingSource: string | null;
    createdAt: string;
    timezone: string | null;
    currency: string | null;
    upgradeRequestedPlan: string | null;
    upgradeRequestedAt: string | null;
    upgradeNote: string | null;
  };
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    billingCycle: string;
    plan: { id: string; code: string; nameEn: string; nameAr: string } | null;
  } | null;
  overrides: Array<{
    id: string;
    moduleKey: string | null;
    featureKey: string | null;
    kind: string;
    valueJson: string | null;
    reason: string | null;
    createdAt: string;
    expiresAt: string | null;
  }>;
  staff: Array<{ id: string; name: string | null; email: string; role: string | null }>;
  branches: Array<{ id: string; name: string; status: string }>;
  entitlements: {
    plan: { code: string; nameEn: string; nameAr: string; price: number };
    modules: Record<string, boolean>;
    features: Record<string, { enabled: boolean; limit: number | null }>;
    source: string;
  };
  usage: { patients: number; staff: number; doctors: number; appointmentsMonth: number };
  limitUsage: LimitUsage[];
};

export function SuperClinicDetail({ t }: { t: Dictionary }) {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const [data, setData] = useState<DetailPayload | null>(null);
  const [plans, setPlans] = useState<Array<{ id: string; code: string; nameEn: string; nameAr: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [overrideForm, setOverrideForm] = useState({
    kind: "module_override",
    moduleKey: "",
    featureKey: "",
    valueJson: '{"enabled":true}',
    reason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailResponse, plansResponse] = await Promise.all([
        fetch(`/api/super/orgs/${orgId}/detail`, { cache: "no-store" }),
        fetch("/api/super/plans", { cache: "no-store" }),
      ]);
      if (!detailResponse.ok || !plansResponse.ok) {
        setError(t["common_error"]);
        return;
      }
      const [detailData, plansData] = await Promise.all([
        detailResponse.json(),
        plansResponse.json(),
      ]);
      setData(detailData);
      setPlans(plansData.plans ?? []);
    } catch {
      setError(t["common_error"]);
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(path: string, method: string, body?: unknown) {
    setBusy(path);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const res = await response.json().catch(() => ({}));
        setError((res as { error?: string }).error ?? t["common_error"]);
        return false;
      }
      setMessage(t["plans_saved"]);
      await load();
      return true;
    } catch {
      setError(t["common_error"]);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function createOverride() {
    const valueJson = overrideForm.valueJson;
    try {
      JSON.parse(valueJson);
    } catch {
      setError(t["plans_jsonInvalid"]);
      return;
    }
    const ok = await run(`/api/super/orgs/${orgId}/override`, "POST", {
      kind: overrideForm.kind,
      moduleKey: overrideForm.moduleKey || null,
      featureKey: overrideForm.featureKey || null,
      valueJson,
      reason: overrideForm.reason || null,
    });
    if (ok) {
      setOverrideForm({ kind: "module_override", moduleKey: "", featureKey: "", valueJson: '{"enabled":true}', reason: "" });
    }
  }

  const moduleList = useMemo(() => Object.keys(data?.entitlements.modules ?? {}).sort(), [data]);
  const limitLabels: Record<string, string> = {
    patients: t["mtr_patients"],
    staff: t["mtr_staff"],
    doctors: t["mtr_doctors"],
    appointments_month: t["mtr_appointments"],
    storage_gb: t["mtr_storage"],
  };

  if (loading) {
    return (
      <div className="surface-panel flex items-center justify-center gap-2 rounded-[28px] p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{t["common_loading"]}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="surface-panel rounded-[28px] p-12 text-center text-sm text-muted-foreground">
        {error ?? t["common_error"]}
      </div>
    );
  }

  const statusBadge =
    data.org.status === "active" ? (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{t["super_activeOrg"]}</span>
    ) : data.org.status === "suspended" ? (
      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">{t["super_suspendedOrg"]}</span>
    ) : (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{t["super_pendingOrg"]}</span>
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-content-center rounded-[16px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">{data.org.name}</h1>
            <p className="text-sm text-muted-foreground">@{data.org.slug ?? "—"}</p>
          </div>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/super"
            className="inline-flex items-center gap-2 rounded-[14px] border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:text-foreground dark:border-white/6 dark:bg-white/[0.04]"
          >
            <X className="h-4 w-4" />
            {t["super_backToConsole"]}
          </Link>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="grid size-10 place-content-center rounded-[14px] border border-white/60 bg-white/70 text-muted-foreground shadow-sm transition hover:text-foreground dark:border-white/6 dark:bg-white/[0.04] disabled:opacity-50"
            aria-label={t["super_refresh"]}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</p>
      ) : null}

      {/* Plan + subscription */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t["plans_title"]}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xl font-semibold">
              {data.entitlements.plan.nameEn || data.org.plan}
            </span>
            {data.entitlements.source === "overridden" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {t["clinic_overridden"]}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t["clinic_subStatus"]}:{" "}
            {data.subscription ? t[`sub_status${data.subscription.status}` as keyof Dictionary] ?? data.subscription.status : t["sub_statusactive"]}
          </p>
          {data.subscription?.currentPeriodEnd ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t["clinic_periodEnd"]}: {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          ) : null}
          {data.org.upgradeRequestedPlan ? (
            <div className="mt-3 rounded-[16px] border border-cyan-200 bg-cyan-50/70 p-3 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/8 dark:text-cyan-200">
              {t["plan_upgradeRequested"]} → <span className="font-semibold">{data.org.upgradeRequestedPlan}</span>
              {data.org.upgradeNote ? (
                <p className="mt-1 text-xs">{data.org.upgradeNote}</p>
              ) : null}
              <div className="mt-2 flex gap-2">
                <button
                  disabled={busy !== null}
                  onClick={() => void run(`/api/super/orgs/${orgId}/upgrade`, "POST", { approve: true })}
                  className="inline-flex items-center gap-1 rounded-[10px] bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> {t["plan_approve"]}
                </button>
                <button
                  disabled={busy !== null}
                  onClick={() => void run(`/api/super/orgs/${orgId}/upgrade`, "POST", { approve: false })}
                  className="inline-flex items-center gap-1 rounded-[10px] bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> {t["plan_decline"]}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-sm font-semibold">{t["clinic_changePlan"]}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  disabled={busy !== null}
                  onClick={() => void run(`/api/super/orgs/${orgId}/plan`, "POST", { plan: plan.code })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition disabled:opacity-50 ${
                    data.org.plan === plan.code
                      ? "bg-primary text-white"
                      : "border border-white/60 bg-white/60 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]"
                  }`}
                >
                  {plan.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t["plan_usage"]}</p>
          <div className="mt-4 space-y-3.5">
            {data.limitUsage.map((entry) => (
              <div key={entry.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{limitLabels[entry.key] ?? entry.key}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.unlimited ? "∞" : `${entry.used.toLocaleString()} / ${entry.limit.toLocaleString()}`}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/70 dark:bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${entry.percent >= 90 ? "bg-red-500" : entry.percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${entry.unlimited ? 0 : entry.percent}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Stat icon={<Users className="h-4 w-4" />} label={t["mtr_doctors"]} value={String(data.usage.doctors)} />
              <Stat icon={<DollarSign className="h-4 w-4" />} label={t["clinic_currency"]} value={data.org.currency ?? "USD"} />
            </div>
          </div>
        </div>
      </div>

      {/* Module matrix */}
      <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t["clinic_modules"]}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {moduleList.map((module) => {
            const enabled = data.entitlements.modules[module] === true;
            return (
              <div key={module} className="flex items-center justify-between rounded-[12px] bg-white/50 px-3 py-2 text-sm dark:bg-white/[0.03]">
                <span className="capitalize">{t[`nav_${module}` as keyof Dictionary] ?? module}</span>
                {enabled ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overrides */}
      <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t["clinic_overrides"]}</p>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {t["super_adminOnly"]}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {data.overrides.length === 0 ? (
            <p className="rounded-[14px] bg-white/45 p-4 text-center text-sm text-muted-foreground dark:bg-white/[0.03]">
              {t["clinic_noOverrides"]}
            </p>
          ) : (
            data.overrides.map((override) => (
              <div key={override.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-white/60 bg-white/50 p-3 text-sm dark:border-white/8 dark:bg-white/[0.03]">
                <div>
                  <p className="font-mono text-xs">
                    {override.kind} · {override.moduleKey ?? override.featureKey}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {override.reason ?? "—"}
                    {override.expiresAt ? ` · ${t["clinic_expires"]} ${new Date(override.expiresAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <button
                  disabled={busy !== null}
                  onClick={() => void run(`/api/super/orgs/${orgId}/override/${override.id}`, "DELETE")}
                  className="grid size-8 place-content-center rounded-[10px] border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-400/20 dark:hover:bg-red-400/10"
                  aria-label={t["plans_archive"]}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 grid gap-3 rounded-[18px] border border-white/55 bg-white/40 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/6 dark:bg-white/[0.02]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">{t["clinic_overrideKind"]}</span>
            <select
              value={overrideForm.kind}
              onChange={(event) => setOverrideForm({ ...overrideForm, kind: event.target.value })}
              className="w-full rounded-[10px] border border-white/60 bg-white/70 px-2.5 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <option value="module_override">module_override</option>
              <option value="feature_override">feature_override</option>
              <option value="limit_override">limit_override</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">{t["clinic_moduleKey"]}</span>
            <input
              value={overrideForm.moduleKey}
              onChange={(event) => setOverrideForm({ ...overrideForm, moduleKey: event.target.value })}
              className="w-full rounded-[10px] border border-white/60 bg-white/70 px-2.5 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">{t["clinic_featureKey"]}</span>
            <input
              value={overrideForm.featureKey}
              onChange={(event) => setOverrideForm({ ...overrideForm, featureKey: event.target.value })}
              className="w-full rounded-[10px] border border-white/60 bg-white/70 px-2.5 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">{t["clinic_reason"]}</span>
            <input
              value={overrideForm.reason}
              onChange={(event) => setOverrideForm({ ...overrideForm, reason: event.target.value })}
              className="w-full rounded-[10px] border border-white/60 bg-white/70 px-2.5 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-xs font-semibold">{t["clinic_valueJson"]} <span className="text-muted-foreground font-normal">({t["plans_jsonHint"]})</span></span>
            <div className="flex gap-2">
              <input
                value={overrideForm.valueJson}
                onChange={(event) => setOverrideForm({ ...overrideForm, valueJson: event.target.value })}
                spellCheck={false}
                className="w-full rounded-[10px] border border-white/60 bg-white/70 px-2.5 py-2 font-mono text-xs dark:border-white/10 dark:bg-white/[0.04]"
              />
              <button
                onClick={() => void createOverride()}
                disabled={busy !== null || (!overrideForm.moduleKey && !overrideForm.featureKey)}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t["clinic_addOverride"]}
              </button>
            </div>
          </label>
        </div>
      </div>

      {/* Staff + branches */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t["super_staff"]}</p>
          <div className="mt-3 space-y-1.5">
            {data.staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-[12px] bg-white/50 px-3 py-2 text-sm dark:bg-white/[0.03]">
                <div>
                  <p className="font-medium">{member.name ?? member.email}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {member.role ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t["super_branches"]}</p>
          <div className="mt-3 space-y-1.5">
            {data.branches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between rounded-[12px] bg-white/50 px-3 py-2 text-sm dark:bg-white/[0.03]">
                <p className="font-medium">{branch.name}</p>
                <span className="text-xs text-muted-foreground capitalize">{branch.status}</span>
              </div>
            ))}
            {data.branches.length === 0 ? (
              <p className="rounded-[12px] bg-white/40 p-4 text-center text-sm text-muted-foreground dark:bg-white/[0.02]">
                {t["clinic_noBranches"]}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
        {t["clinic_tenantNote"]}
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-white/50 px-3 py-2 text-sm dark:bg-white/[0.03]">
      <div className="grid size-8 place-content-center rounded-[10px] bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}