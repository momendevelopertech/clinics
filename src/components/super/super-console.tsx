"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Building2,
  Check,
  ClipboardCheck,
  Loader2,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/locale/language-switcher";

type OrgRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  plan: string;
  onboardingSource: string | null;
  upgradeRequestedPlan: string | null;
  upgradeRequestedAt: string | null;
  upgradeNote: string | null;
  createdAt: string;
  _count: { users: number; patients: number };
  users: Array<{ email: string; role: string | null; name: string | null }>;
  usage: { patients: number; staff: number; appointmentsThisMonth: number };
  limits: { maxPatients: number; maxStaff: number; maxAppointmentsPerMonth: number };
};

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
  organization: { name: string; slug: string | null };
  user: { name: string | null; email: string } | null;
};

type PlatformSettings = {
  maintenanceMode: boolean;
  allowClinicSignups: boolean;
  defaultPlan: string;
  supportEmail: string;
  announcement: string;
};

const PLANS = ["free", "clinic", "plus"] as const;
type Section = "organizations" | "approvals" | "billing" | "audit" | "settings";

function formatUsage(value: number, limit: number) {
  return `${value.toLocaleString()} / ${limit >= 999_999 ? "∞" : limit.toLocaleString()}`;
}

export function SuperConsole({ t }: { t: Dictionary }) {
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const initialSection: Section =
    requestedSection === "approvals" ||
    requestedSection === "billing" ||
    requestedSection === "audit" ||
    requestedSection === "settings"
      ? requestedSection
      : "organizations";
  const [section, setSection] = useState<Section>(initialSection);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    allowClinicSignups: true,
    defaultPlan: "free",
    supportEmail: "",
    announcement: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgResponse, auditResponse, settingsResponse] = await Promise.all([
        fetch("/api/super/orgs", { cache: "no-store" }),
        fetch("/api/super/audit", { cache: "no-store" }),
        fetch("/api/super/settings", { cache: "no-store" }),
      ]);
      if (!orgResponse.ok || !auditResponse.ok || !settingsResponse.ok) {
        setError(t["common_error"]);
        return;
      }
      const [orgData, auditData, settingsData] = await Promise.all([
        orgResponse.json(),
        auditResponse.json(),
        settingsResponse.json(),
      ]);
      setOrgs(orgData.orgs ?? []);
      setAudit(auditData.logs ?? []);
      setSettings((current) => ({ ...current, ...(settingsData.settings ?? {}) }));
    } catch {
      setError(t["common_error"]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  async function act(path: string, body: Record<string, unknown>) {
    setBusyId(path);
    setError(null);
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

  async function saveSettings() {
    setSavingSettings(true);
    setError(null);
    try {
      const response = await fetch("/api/super/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) {
        setError(t["common_error"]);
        return;
      }
      const data = await response.json();
      setSettings((current) => ({ ...current, ...(data.settings ?? {}) }));
    } catch {
      setError(t["common_error"]);
    } finally {
      setSavingSettings(false);
    }
  }

  const pendingSignups = useMemo(() => orgs.filter((org) => org.status === "pending"), [orgs]);
  const upgradeRequests = useMemo(
    () => orgs.filter((org) => org.upgradeRequestedPlan),
    [orgs],
  );

  const statusBadge = (status: string) => {
    const styles =
      status === "active"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : status === "suspended"
          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    const label =
      status === "active"
        ? t["super_activeOrg"]
        : status === "suspended"
          ? t["super_suspendedOrg"]
          : t["super_pendingOrg"];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
        <span className="size-1.5 rounded-full bg-current" />
        {label}
      </span>
    );
  };

  const sectionTabs: Array<{ id: Section; label: string; icon: typeof Building2 }> = [
    { id: "organizations", label: t["super_sectionOrganizations"], icon: Building2 },
    { id: "approvals", label: t["super_sectionApprovals"], icon: ClipboardCheck },
    { id: "billing", label: t["super_sectionBilling"], icon: Wallet },
    { id: "audit", label: t["super_sectionAudit"], icon: ShieldCheck },
    { id: "settings", label: t["super_sectionSettings"], icon: Settings },
  ];

  return (
    <main className="hero-glow min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/super"
              className="grid size-11 place-content-center rounded-[16px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20"
            >
              <Activity className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t["super_title"]}</h1>
              <p className="text-sm text-muted-foreground">{t["super_subtitle"]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="grid size-10 place-content-center rounded-[14px] border border-white/60 bg-white/70 text-muted-foreground shadow-sm transition hover:text-foreground dark:border-white/6 dark:bg-white/[0.04] disabled:opacity-50"
              aria-label={t["super_refresh"]}
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

        <nav className="mt-7 flex gap-2 overflow-x-auto border-b border-white/50 pb-2 dark:border-white/8">
          {sectionTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-[14px] px-3 py-2 text-sm font-semibold transition ${
                section === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/[0.05]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="surface-panel mt-6 flex items-center justify-center gap-2 rounded-[28px] p-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t["common_loading"]}</span>
          </div>
        ) : (
          <>
            {section === "organizations" ? (
              <OrganizationsSection orgs={orgs} t={t} statusBadge={statusBadge} />
            ) : null}
            {section === "approvals" ? (
              <ApprovalsSection
                pendingSignups={pendingSignups}
                upgradeRequests={upgradeRequests}
                t={t}
                statusBadge={statusBadge}
                busyId={busyId}
                act={act}
              />
            ) : null}
            {section === "billing" ? (
              <BillingSection orgs={orgs} t={t} busyId={busyId} act={act} />
            ) : null}
            {section === "audit" ? <AuditSection audit={audit} t={t} /> : null}
            {section === "settings" ? (
              <SettingsSection
                settings={settings}
                setSettings={setSettings}
                saving={savingSettings}
                save={saveSettings}
                t={t}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function OrganizationsSection({
  orgs,
  t,
  statusBadge,
}: {
  orgs: OrgRow[];
  t: Dictionary;
  statusBadge: (status: string) => React.ReactNode;
}) {
  return (
    <section className="mt-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t["super_orgs"]}</h2>
        <p className="text-sm text-muted-foreground">{t["super_organizationsHelp"]}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [t["super_totalClinics"], orgs.length],
          [t["super_activeClinics"], orgs.filter((org) => org.status === "active").length],
          [t["super_pendingClinics"], orgs.filter((org) => org.status === "pending").length],
        ].map(([label, value]) => (
          <div key={label} className="surface-panel rounded-[22px] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="surface-panel overflow-hidden rounded-[28px] border border-white/55 dark:border-white/6">
        {orgs.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">{t["super_noOrgs"]}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/55 text-xs uppercase tracking-widest text-muted-foreground dark:border-white/6">
                  <th className="px-5 py-3">{t["super_orgs"]}</th>
                  <th className="px-5 py-3">{t["super_status"]}</th>
                  <th className="px-5 py-3">{t["super_plan"]}</th>
                  <th className="px-5 py-3">{t["super_usage"]}</th>
                  <th className="px-5 py-3">{t["super_created"]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/45 dark:divide-white/5">
                {orgs.map((org) => (
                  <tr key={org.id} className="align-top hover:bg-white/40 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{org.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {org.slug ?? "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4">{statusBadge(org.status)}</td>
                    <td className="px-5 py-4 font-semibold capitalize">{org.plan}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      <div>{t["super_patients"]}: {formatUsage(org.usage.patients, org.limits.maxPatients)}</div>
                      <div>{t["super_staff"]}: {formatUsage(org.usage.staff, org.limits.maxStaff)}</div>
                      <div>{t["super_appointments"]}: {formatUsage(org.usage.appointmentsThisMonth, org.limits.maxAppointmentsPerMonth)}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function ApprovalsSection({
  pendingSignups,
  upgradeRequests,
  t,
  statusBadge,
  busyId,
  act,
}: {
  pendingSignups: OrgRow[];
  upgradeRequests: OrgRow[];
  t: Dictionary;
  statusBadge: (status: string) => React.ReactNode;
  busyId: string | null;
  act: (path: string, body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      <ApprovalCard title={t["super_pendingSignups"]} empty={pendingSignups.length === 0} emptyText={t["super_noPending"]}>
        {pendingSignups.map((org) => (
          <div key={org.id} className="rounded-[18px] border border-white/60 bg-white/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{org.name}</p><p className="text-xs text-muted-foreground">{org.users[0]?.email ?? org.slug}</p></div>
              {statusBadge(org.status)}
            </div>
            <div className="mt-3 flex gap-2">
              <ActionButton
                disabled={busyId !== null}
                onClick={() => void act(`/api/super/orgs/${org.id}/status`, { status: "active" })}
                variant="success"
                icon={<Check className="h-3.5 w-3.5" />}
              >{t["super_approve"]}</ActionButton>
              <ActionButton
                disabled={busyId !== null}
                onClick={() => void act(`/api/super/orgs/${org.id}/status`, { status: "suspended" })}
                variant="danger"
                icon={<X className="h-3.5 w-3.5" />}
              >{t["super_decline"]}</ActionButton>
            </div>
          </div>
        ))}
      </ApprovalCard>
      <ApprovalCard title={t["super_upgradeRequests"]} empty={upgradeRequests.length === 0} emptyText={t["super_noPending"]}>
        {upgradeRequests.map((org) => (
          <div key={org.id} className="rounded-[18px] border border-white/60 bg-white/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{org.name}</p><p className="text-xs text-muted-foreground">{org.plan} → <span className="font-semibold text-cyan-700 dark:text-cyan-300">{org.upgradeRequestedPlan}</span></p></div>
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">{t["super_upgradeRequested"]}</span>
            </div>
            {org.upgradeNote ? <p className="mt-2 text-xs text-muted-foreground">{org.upgradeNote}</p> : null}
            <div className="mt-3 flex gap-2">
              <ActionButton disabled={busyId !== null} onClick={() => void act(`/api/super/orgs/${org.id}/upgrade`, { approve: true })} variant="success" icon={<Check className="h-3.5 w-3.5" />}>{t["super_upgradeApprove"]}</ActionButton>
              <ActionButton disabled={busyId !== null} onClick={() => void act(`/api/super/orgs/${org.id}/upgrade`, { approve: false })} variant="danger" icon={<X className="h-3.5 w-3.5" />}>{t["super_upgradeDecline"]}</ActionButton>
            </div>
          </div>
        ))}
      </ApprovalCard>
    </section>
  );
}

function ApprovalCard({ title, empty, emptyText, children }: { title: string; empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <div className="surface-panel rounded-[28px] border border-white/55 p-5 dark:border-white/6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{empty ? <p className="rounded-[16px] bg-white/45 p-6 text-center text-sm text-muted-foreground dark:bg-white/[0.03]">{emptyText}</p> : children}</div>
    </div>
  );
}

function BillingSection({ orgs, t, busyId, act }: { orgs: OrgRow[]; t: Dictionary; busyId: string | null; act: (path: string, body: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="mt-6 space-y-4">
      <div><h2 className="text-xl font-semibold">{t["super_sectionBilling"]}</h2><p className="text-sm text-muted-foreground">{t["super_billingHelp"]}</p></div>
      <div className="surface-panel overflow-hidden rounded-[28px] border border-white/55 dark:border-white/6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-white/55 text-xs uppercase tracking-widest text-muted-foreground dark:border-white/6"><th className="px-5 py-3">{t["super_orgs"]}</th><th className="px-5 py-3">{t["super_plan"]}</th><th className="px-5 py-3">{t["super_setPlan"]}</th></tr></thead>
            <tbody className="divide-y divide-white/45 dark:divide-white/5">
              {orgs.map((org) => <tr key={org.id}><td className="px-5 py-4 font-semibold">{org.name}</td><td className="px-5 py-4 capitalize">{org.plan}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{PLANS.map((plan) => <button key={plan} disabled={busyId !== null} onClick={() => void act(`/api/super/orgs/${org.id}/plan`, { plan })} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition disabled:opacity-50 ${org.plan === plan ? "bg-primary text-white" : "border border-white/60 bg-white/60 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]"}`}>{plan}</button>)}</div></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AuditSection({ audit, t }: { audit: AuditRow[]; t: Dictionary }) {
  return (
    <section className="mt-6 space-y-4">
      <div><h2 className="text-xl font-semibold">{t["super_sectionAudit"]}</h2><p className="text-sm text-muted-foreground">{t["super_auditHelp"]}</p></div>
      <div className="surface-panel overflow-hidden rounded-[28px] border border-white/55 dark:border-white/6">
        {audit.length === 0 ? <p className="p-12 text-center text-sm text-muted-foreground">{t["super_noAudit"]}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-white/55 text-xs uppercase tracking-widest text-muted-foreground dark:border-white/6"><th className="px-5 py-3">{t["super_date"]}</th><th className="px-5 py-3">{t["super_action"]}</th><th className="px-5 py-3">{t["super_target"]}</th><th className="px-5 py-3">{t["super_actor"]}</th></tr></thead><tbody className="divide-y divide-white/45 dark:divide-white/5">{audit.map((log) => <tr key={log.id}><td className="px-5 py-4 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td><td className="px-5 py-4"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold">{log.action}</span></td><td className="px-5 py-4"><div className="font-semibold">{log.entityType.replace("platform_", "")}</div><div className="text-xs text-muted-foreground">{log.organization.name}</div></td><td className="px-5 py-4 text-xs text-muted-foreground">{log.user?.name ?? log.user?.email ?? "System"}</td></tr>)}</tbody></table></div>}
      </div>
    </section>
  );
}

function SettingsSection({ settings, setSettings, saving, save, t }: { settings: PlatformSettings; setSettings: React.Dispatch<React.SetStateAction<PlatformSettings>>; saving: boolean; save: () => Promise<void>; t: Dictionary }) {
  return (
    <section className="mt-6 max-w-3xl space-y-4">
      <div><h2 className="text-xl font-semibold">{t["super_sectionSettings"]}</h2><p className="text-sm text-muted-foreground">{t["super_settingsHelp"]}</p></div>
      <div className="surface-panel space-y-5 rounded-[28px] border border-white/55 p-6 dark:border-white/6">
        <label className="flex items-center justify-between gap-4"><span><span className="block font-semibold">{t["super_maintenanceMode"]}</span><span className="text-xs text-muted-foreground">{t["super_maintenanceHelp"]}</span></span><input type="checkbox" checked={settings.maintenanceMode} onChange={(event) => setSettings((current) => ({ ...current, maintenanceMode: event.target.checked }))} className="size-5 accent-primary" /></label>
        <label className="flex items-center justify-between gap-4"><span><span className="block font-semibold">{t["super_allowSignups"]}</span><span className="text-xs text-muted-foreground">{t["super_allowSignupsHelp"]}</span></span><input type="checkbox" checked={settings.allowClinicSignups} onChange={(event) => setSettings((current) => ({ ...current, allowClinicSignups: event.target.checked }))} className="size-5 accent-primary" /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">{t["super_defaultPlan"]}</span><select value={settings.defaultPlan} onChange={(event) => setSettings((current) => ({ ...current, defaultPlan: event.target.value }))} className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]">{PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">{t["super_supportEmail"]}</span><input value={settings.supportEmail} onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))} className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]" /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">{t["super_announcement"]}</span><textarea value={settings.announcement} onChange={(event) => setSettings((current) => ({ ...current, announcement: event.target.value }))} rows={3} className="w-full rounded-[12px] border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]" /></label>
        <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? t["common_saving"] : t["common_save"]}</button>
      </div>
    </section>
  );
}

function ActionButton({ children, onClick, disabled, variant, icon }: { children: React.ReactNode; onClick: () => void; disabled: boolean; variant: "success" | "danger"; icon: React.ReactNode }) {
  return <button disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${variant === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>{icon}{children}</button>;
}
