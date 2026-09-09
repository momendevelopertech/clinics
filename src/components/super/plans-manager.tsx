"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  Copy,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";

type PlanRow = {
  id: string;
  code: string;
  internalCode: string | null;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number | string;
  billingCycle: string;
  status: string;
  displayOrder: number;
  popular: boolean;
  trialDays: number;
  modulesJson: string | null;
  featuresJson: string | null;
  upgradeTargetId: string | null;
  downgradeTargetIdsJson: string | null;
  downgradesAllowed: boolean;
  _count?: { subscriptions: number };
  upgradeTarget?: { id: string; code: string; nameEn: string } | null;
  upgradedFrom?: Array<{ id: string; code: string }>;
};

type FormState = {
  id: string | null;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: string;
  billingCycle: string;
  status: string;
  displayOrder: string;
  popular: boolean;
  trialDays: string;
  downgradesAllowed: boolean;
  modulesJson: string;
  featuresJson: string;
  upgradeTargetId: string;
  downgradeTargetIdsJson: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  code: "",
  nameEn: "",
  nameAr: "",
  descriptionEn: "",
  descriptionAr: "",
  price: "0",
  billingCycle: "monthly",
  status: "active",
  displayOrder: "0",
  popular: false,
  trialDays: "0",
  downgradesAllowed: true,
  modulesJson: "",
  featuresJson: "",
  upgradeTargetId: "",
  downgradeTargetIdsJson: "[]",
};

export function PlansManager({ t }: { t: Dictionary }) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/super/plans", { cache: "no-store" });
      if (!response.ok) {
        setError(t["common_error"]);
        return;
      }
      const data = await response.json();
      setPlans(data.plans ?? []);
    } catch {
      setError(t["common_error"]);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        const data = await response.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? t["common_error"]);
        return false;
      }
      await load();
      return true;
    } catch {
      setError(t["common_error"]);
      return false;
    } finally {
      setBusy(null);
    }
  }

  function startCreate() {
    setEditing({ ...EMPTY_FORM, displayOrder: String(plans.length * 10 + 10) });
  }

  function startEdit(plan: PlanRow) {
    setEditing({
      id: plan.id,
      code: plan.code,
      nameEn: plan.nameEn,
      nameAr: plan.nameAr,
      descriptionEn: plan.descriptionEn,
      descriptionAr: plan.descriptionAr,
      price: String(typeof plan.price === "number" ? plan.price : Number(plan.price) || 0),
      billingCycle: plan.billingCycle,
      status: plan.status,
      displayOrder: String(plan.displayOrder),
      popular: plan.popular,
      trialDays: String(plan.trialDays),
      downgradesAllowed: plan.downgradesAllowed,
      modulesJson: plan.modulesJson ?? "",
      featuresJson: plan.featuresJson ?? "",
      upgradeTargetId: plan.upgradeTargetId ?? "",
      downgradeTargetIdsJson: plan.downgradeTargetIdsJson ?? "[]",
    });
  }

  async function saveForm() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      for (const value of [
        editing.modulesJson,
        editing.featuresJson,
        editing.downgradeTargetIdsJson,
      ]) {
        if (value.trim()) {
          JSON.parse(value);
        }
      }
    } catch {
      setError(t["plans_jsonInvalid"]);
      setSaving(false);
      return;
    }

    const body = {
      code: editing.code,
      nameEn: editing.nameEn,
      nameAr: editing.nameAr,
      descriptionEn: editing.descriptionEn,
      descriptionAr: editing.descriptionAr,
      price: Number(editing.price) || 0,
      billingCycle: editing.billingCycle,
      status: editing.status,
      displayOrder: Number(editing.displayOrder) || 0,
      popular: editing.popular,
      trialDays: Number(editing.trialDays) || 0,
      downgradesAllowed: editing.downgradesAllowed,
      modulesJson: editing.modulesJson.trim() || null,
      featuresJson: editing.featuresJson.trim() || null,
      upgradeTargetId: editing.upgradeTargetId || null,
      downgradeTargetIdsJson: editing.downgradeTargetIdsJson.trim() || "[]",
    };

    const ok = editing.id
      ? await run(`/api/super/plans/${editing.id}`, "PATCH", body)
      : await run("/api/super/plans", "POST", body);
    if (ok) {
      setMessage(editing.id ? t["plans_saved"] : t["plans_created"]);
      setEditing(null);
    }
    setSaving(false);
  }

  async function move(plan: PlanRow, dir: -1 | 1) {
    const sorted = [...plans].sort((a, b) => a.displayOrder - b.displayOrder);
    const index = sorted.findIndex((p) => p.id === plan.id);
    const target = sorted[index + dir];
    if (!target) return;
    await Promise.all([
      run(`/api/super/plans/${plan.id}`, "PATCH", { displayOrder: target.displayOrder }),
      run(`/api/super/plans/${target.id}`, "PATCH", { displayOrder: plan.displayOrder }),
    ]);
  }

  async function toggleStatus(plan: PlanRow) {
    const next = plan.status === "active" ? "archived" : "active";
    const ok = await run(`/api/super/plans/${plan.id}`, "PATCH", { status: next });
    if (ok) setMessage(next === "active" ? t["plans_activated"] : t["plans_archived"]);
  }

  const badge = (status: string) =>
    status === "active" ? (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        {t["super_activeOrg"]}
      </span>
    ) : (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        {t["plans_archived"]}
      </span>
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-content-center rounded-[16px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t["plans_title"]}</h1>
            <p className="text-sm text-muted-foreground">{t["plans_subtitle"]}</p>
          </div>
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
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-[14px] bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t["plans_newPlan"]}
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      {editing ? (
        <div className="surface-panel rounded-[28px] border border-white/55 p-6 dark:border-white/6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editing.id ? t["plans_editPlan"] : t["plans_newPlan"]}
            </h2>
            <button
              onClick={() => setEditing(null)}
              className="grid size-9 place-content-center rounded-[12px] border border-white/60 text-muted-foreground hover:text-foreground dark:border-white/8"
              aria-label={t["common_close"]}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t["plans_code"]} hint={t["plans_codeHint"]}>
              <input
                value={editing.code}
                onChange={(event) => setEditing({ ...editing, code: event.target.value })}
                disabled={Boolean(editing.id)}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04] disabled:opacity-50"
              />
            </Field>
            <Field label={t["plans_nameEn"]}>
              <input
                value={editing.nameEn}
                onChange={(event) => setEditing({ ...editing, nameEn: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_nameAr"]}>
              <input
                value={editing.nameAr}
                onChange={(event) => setEditing({ ...editing, nameAr: event.target.value })}
                dir="rtl"
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_descriptionEn"]}>
              <input
                value={editing.descriptionEn}
                onChange={(event) => setEditing({ ...editing, descriptionEn: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_descriptionAr"]}>
              <input
                value={editing.descriptionAr}
                onChange={(event) => setEditing({ ...editing, descriptionAr: event.target.value })}
                dir="rtl"
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_price"]}>
              <input
                type="number"
                min={0}
                value={editing.price}
                onChange={(event) => setEditing({ ...editing, price: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_billingCycle"]}>
              <select
                value={editing.billingCycle}
                onChange={(event) => setEditing({ ...editing, billingCycle: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
            <Field label={t["plans_displayOrder"]}>
              <input
                type="number"
                value={editing.displayOrder}
                onChange={(event) => setEditing({ ...editing, displayOrder: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_trialDays"]}>
              <input
                type="number"
                min={0}
                value={editing.trialDays}
                onChange={(event) => setEditing({ ...editing, trialDays: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_upgradeTarget"]}>
              <select
                value={editing.upgradeTargetId}
                onChange={(event) => setEditing({ ...editing, upgradeTargetId: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="">—</option>
                {plans
                  .filter((plan) => plan.id !== editing.id)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.code} — {plan.nameEn}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={t["plans_status"]}>
              <select
                value={editing.status}
                onChange={(event) => setEditing({ ...editing, status: event.target.value })}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="flex items-end gap-6 pb-1">
              <Toggle
                checked={editing.popular}
                onChange={(value) => setEditing({ ...editing, popular: value })}
                label={t["plans_popular"]}
              />
              <Toggle
                checked={editing.downgradesAllowed}
                onChange={(value) => setEditing({ ...editing, downgradesAllowed: value })}
                label={t["plans_downgradesAllowed"]}
              />
            </div>
            <Field label={t["plans_modulesJson"]} hint={t["plans_jsonHint"]}>
              <textarea
                value={editing.modulesJson}
                onChange={(event) => setEditing({ ...editing, modulesJson: event.target.value })}
                rows={4}
                spellCheck={false}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_featuresJson"]} hint={t["plans_jsonHint"]}>
              <textarea
                value={editing.featuresJson}
                onChange={(event) => setEditing({ ...editing, featuresJson: event.target.value })}
                rows={4}
                spellCheck={false}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
            <Field label={t["plans_downgradeTargets"]} hint={t["plans_jsonHint"]}>
              <textarea
                value={editing.downgradeTargetIdsJson}
                onChange={(event) =>
                  setEditing({ ...editing, downgradeTargetIdsJson: event.target.value })
                }
                rows={4}
                spellCheck={false}
                className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-white/[0.04]"
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-[12px] border border-white/60 bg-white/60 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground dark:border-white/8 dark:bg-white/[0.03]"
            >
              {t["common_cancel"]}
            </button>
            <button
              onClick={() => void saveForm()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? t["common_saving"] : t["common_save"]}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="surface-panel flex items-center justify-center gap-2 rounded-[28px] p-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t["common_loading"]}</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="surface-panel rounded-[28px] p-12 text-center text-sm text-muted-foreground">
          {t["plans_noPlans"]}
        </div>
      ) : (
        <div className="surface-panel overflow-hidden rounded-[28px] border border-white/55 dark:border-white/6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/55 text-xs uppercase tracking-widest text-muted-foreground dark:border-white/6">
                  <th className="px-4 py-3" />
                  <th className="px-4 py-3">{t["plans_plan"]}</th>
                  <th className="px-4 py-3">{t["plans_price"]}</th>
                  <th className="px-4 py-3">{t["plans_billingCycle"]}</th>
                  <th className="px-4 py-3">{t["plans_displayOrder"]}</th>
                  <th className="px-4 py-3">{t["plans_trialDays"]}</th>
                  <th className="px-4 py-3">{t["plans_subscribers"]}</th>
                  <th className="px-4 py-3">{t["plans_actions"]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/45 dark:divide-white/5">
                {[...plans]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((plan) => (
                    <tr key={plan.id} className="align-middle hover:bg-white/40 dark:hover:bg-white/[0.03]">
                      <td className="px-2 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => void move(plan, -1)}
                            disabled={busy !== null}
                            className="grid size-7 place-content-center rounded-[9px] text-muted-foreground hover:bg-white/70 dark:hover:bg-white/[0.06] disabled:opacity-40"
                            aria-label={t["plans_moveUp"]}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void move(plan, 1)}
                            disabled={busy !== null}
                            className="grid size-7 place-content-center rounded-[9px] text-muted-foreground hover:bg-white/70 dark:hover:bg-white/[0.06] disabled:opacity-40"
                            aria-label={t["plans_moveDown"]}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 place-content-center rounded-[12px] bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 font-semibold">
                              <span className="font-mono text-xs text-muted-foreground">{plan.code}</span>
                              {plan.popular ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                  {t["plans_popular"]}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-sm font-semibold">{plan.nameEn}</div>
                            <div className="text-xs text-muted-foreground">{plan.nameAr}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ${typeof plan.price === "number" ? plan.price.toLocaleString() : Number(plan.price).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 capitalize">{plan.billingCycle}</td>
                      <td className="px-4 py-3">{plan.displayOrder}</td>
                      <td className="px-4 py-3">{plan.trialDays}</td>
                      <td className="px-4 py-3">{plan._count?.subscriptions ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {badge(plan.status)}
                          <button
                            onClick={() => startEdit(plan)}
                            className="grid size-8 place-content-center rounded-[10px] border border-white/60 text-muted-foreground transition hover:text-foreground dark:border-white/8"
                            aria-label={t["plans_editPlan"]}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void run(`/api/super/plans/${plan.id}/duplicate`, "POST")}
                            disabled={busy !== null}
                            className="grid size-8 place-content-center rounded-[10px] border border-white/60 text-muted-foreground transition hover:text-foreground dark:border-white/8 disabled:opacity-40"
                            aria-label={t["plans_duplicate"]}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void toggleStatus(plan)}
                            disabled={busy !== null}
                            className="grid size-8 place-content-center rounded-[10px] border border-white/60 text-muted-foreground transition hover:text-foreground dark:border-white/8 disabled:opacity-40"
                            aria-label={t["plans_archive"]}
                          >
                            {plan.status === "active" ? <Trash2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
}