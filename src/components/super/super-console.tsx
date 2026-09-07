"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  Check,
  CircleSlash2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/locale/language-switcher";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  onboardingSource: string | null;
  upgradeRequestedPlan: string | null;
  upgradeRequestedAt: string | null;
  upgradeNote: string | null;
  createdAt: string;
  _count: { users: number; patients: number };
  users: Array<{ email: string; role: string | null; name: string | null }>;
};

const PLANS = ["free", "clinic", "plus"] as const;

export function SuperConsole({ t }: { t: Dictionary }) {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/super/orgs", { cache: "no-store" });
      if (!response.ok) {
        setError(t["common_error"]);
        return;
      }
      const data = await response.json();
      setOrgs(data.orgs ?? []);
    } catch {
      setError(t["common_error"]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(path: string, body: Record<string, unknown>) {
    setBusyId(path);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? t["common_error"]);
        return;
      }
      await load();
    } catch {
      setError(t["common_error"]);
    } finally {
      setBusyId(null);
    }
  }

  const statusBadge = (status: string) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t["super_activeOrg"]}
        </span>
      );
    }
    if (status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
          <CircleSlash2 className="h-3 w-3" />
          {t["super_suspendedOrg"]}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500" />
        {t["super_pendingOrg"]}
      </span>
    );
  };

  return (
    <main className="hero-glow min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="grid size-11 place-content-center rounded-[16px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20"
            >
              <Activity className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                {t["super_title"]}
              </h1>
              <p className="text-sm text-muted-foreground">{t["super_subtitle"]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="grid size-10 place-content-center rounded-[14px] border border-white/60 bg-white/70 text-muted-foreground shadow-sm transition hover:text-foreground dark:border-white/6 dark:bg-white/[0.04] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <LanguageSwitcher />
          </div>
        </header>

        {error ? (
          <p className="mt-6 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <section className="surface-panel mt-6 overflow-hidden rounded-[28px] border border-white/55 dark:border-white/6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">...</span>
            </div>
          ) : orgs.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              {t["super_noOrgs"]}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/55 text-xs uppercase tracking-widest text-muted-foreground dark:border-white/6">
                    <th className="px-5 py-3 font-semibold">{t["super_orgs"]}</th>
                    <th className="px-5 py-3 font-semibold">{t["super_status"]}</th>
                    <th className="px-5 py-3 font-semibold">{t["super_plan"]}</th>
                    <th className="px-5 py-3 font-semibold">Users / Patients</th>
                    <th className="px-5 py-3 font-semibold">{t["super_created"]}</th>
                    <th className="px-5 py-3 text-right font-semibold">{"Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/45 dark:divide-white/5">
                  {orgs.map((org) => (
                    <tr key={org.id} className="align-top transition-colors hover:bg-white/40 dark:hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{org.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {org.slug}
                        </div>
                        {org.users[0] ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {org.users[0].name || org.users[0].email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">{statusBadge(org.status)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {PLANS.map((plan) => (
                            <button
                              key={plan}
                              disabled={busyId !== null}
                              onClick={() =>
                                void act(`/api/super/orgs/${org.id}/plan`, { plan })
                              }
                              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition disabled:opacity-50 ${
                                org.plan === plan
                                  ? "bg-primary text-white shadow-sm"
                                  : "border border-white/60 bg-white/60 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]"
                              }`}
                            >
                              {plan}
                            </button>
                          ))}
                        </div>
                        {org.upgradeRequestedPlan ? (
                          <div className="mt-2 rounded-[12px] border border-cyan-200 bg-cyan-50/70 p-2.5 dark:border-cyan-400/20 dark:bg-cyan-400/8">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                              <Sparkles className="h-3.5 w-3.5" />
                              {t["super_upgradeRequested"]}: {org.upgradeRequestedPlan}
                            </div>
                            {org.upgradeNote ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t["super_note"]}: {org.upgradeNote}
                              </p>
                            ) : null}
                            <div className="mt-2 flex gap-2">
                              <button
                                disabled={busyId !== null}
                                onClick={() =>
                                  void act(`/api/super/orgs/${org.id}/upgrade`, {
                                    approve: true,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-[10px] bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <Check className="h-3 w-3" />
                                {t["super_upgradeApprove"]}
                              </button>
                              <button
                                disabled={busyId !== null}
                                onClick={() =>
                                  void act(`/api/super/orgs/${org.id}/upgrade`, {
                                    approve: false,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-[10px] border border-white/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground dark:border-white/10 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                                {t["super_upgradeDecline"]}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {org._count.users}
                        <span className="mx-1 text-white/30">/</span>
                        {org._count.patients}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {org.status === "active" ? (
                            <button
                              disabled={busyId !== null}
                              onClick={() =>
                                void act(`/api/super/orgs/${org.id}/status`, {
                                  status: "suspended",
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-[12px] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300 disabled:opacity-50"
                            >
                              <CircleSlash2 className="h-3 w-3" />
                              {t["super_suspend"]}
                            </button>
                          ) : (
                            <button
                              disabled={busyId !== null}
                              onClick={() =>
                                void act(`/api/super/orgs/${org.id}/status`, {
                                  status: "active",
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-[12px] bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {org.status === "suspended"
                                ? t["super_reactivate"]
                                : t["super_approve"]}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}