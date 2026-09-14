"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
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
  LogOut,
  Lock,
  Plug,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/locale/language-switcher";
import { PendingServicesSection } from "@/components/super/pending-services-section";

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

type PlanOption = { code: string; nameEn: string };

const FALLBACK_PLANS: PlanOption[] = [
  { code: "free", nameEn: "Starter" },
  { code: "clinic", nameEn: "Clinic" },
  { code: "plus", nameEn: "Plus" },
];
type Section = "organizations" | "approvals" | "billing" | "audit" | "settings" | "services";

function formatUsage(value: number, limit: number) {
  return `${value.toLocaleString()} / ${limit >= 999_999 ? "∞" : limit.toLocaleString()}`;
}

export function SuperConsole({ t }: { t: Dictionary }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const initialSection: Section =
    requestedSection === "approvals" ||
    requestedSection === "billing" ||
    requestedSection === "audit" ||
    requestedSection === "services" ||
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
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgResponse, auditResponse, settingsResponse, plansResponse] = await Promise.all([
        fetch("/api/super/orgs", { cache: "no-store" }),
        fetch("/api/super/audit", { cache: "no-store" }),
        fetch("/api/super/settings", { cache: "no-store" }),
        fetch("/api/super/plans", { cache: "no-store" }),
      ]);
      if (!orgResponse.ok || !auditResponse.ok || !settingsResponse.ok) {
        setError(t["common_error"]);
        return;
      }
      const [orgData, auditData, settingsData, plansData] = await Promise.all([
        orgResponse.json(),
        auditResponse.json(),
        settingsResponse.json(),
        plansResponse.ok ? plansResponse.json() : Promise.resolve({ plans: [] }),
      ]);
      setOrgs(orgData.orgs ?? []);
      setAudit(auditData.logs ?? []);
      setSettings((current) => ({ ...current, ...(settingsData.settings ?? {}) }));
      const catalogPlans: PlanOption[] = Array.isArray(plansData.plans)
        ? plansData.plans
            .filter((plan: { status?: string }) => plan.status !== "archived")
            .map((plan: { code: string; nameEn: string }) => ({
              code: plan.code,
              nameEn: plan.nameEn,
            }))
        : [];
      if (catalogPlans.length > 0) setAvailablePlans(catalogPlans);
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

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const result = await signOut({ redirect: false, callbackUrl: "/login" });
      router.replace(result?.url || "/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
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
        ? "bg-success-bg text-success-text"
        : status === "suspended"
          ? "bg-critical-bg text-critical-text"
          : "bg-warning-bg text-warning-text";
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
    { id: "services", label: t["super_sectionServices"], icon: Plug },
    { id: "settings", label: t["super_sectionSettings"], icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/super"
              className="grid size-11 place-content-center rounded-lg bg-primary text-primary-foreground shadow-xs"
            >
              <Activity className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{t["super_title"]}</h1>
              <p className="text-sm text-muted-foreground">{t["super_subtitle"]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="grid size-10 place-content-center rounded-md border border-border bg-card text-muted-foreground shadow-xs transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label={t["super_refresh"]}
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/super/plans"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-xs transition hover:bg-muted hover:text-foreground"
            >
              <Lock className="h-4 w-4" />
              {t["super_navPlans"]}
            </Link>
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 rounded-md border border-critical-border bg-critical-bg px-3 py-2 text-sm font-semibold text-critical-text shadow-xs transition hover:bg-critical-border/20 disabled:cursor-wait disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? `${t["header_logout"]}...` : t["header_logout"]}
            </button>
          </div>
        </header>

        {error ? (
          <p className="mt-6 rounded-lg border border-critical-border bg-critical-bg px-4 py-3 text-sm text-critical-text">
            {error}
          </p>
        ) : null}

        <nav className="mt-7 flex gap-2 overflow-x-auto border-b border-border pb-2">
          {sectionTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                section === id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-12 text-muted-foreground">
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
              <BillingSection orgs={orgs} t={t} busyId={busyId} act={act} plans={availablePlans} />
            ) : null}
            {section === "audit" ? <AuditSection audit={audit} t={t} /> : null}
            {section === "services" ? <PendingServicesSection t={t} /> : null}
            {section === "settings" ? (
              <SettingsSection
                settings={settings}
                setSettings={setSettings}
                saving={savingSettings}
                save={saveSettings}
                t={t}
                plans={availablePlans}
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
        <h2 className="text-xl font-semibold text-foreground">{t["super_orgs"]}</h2>
        <p className="text-sm text-muted-foreground">{t["super_organizationsHelp"]}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [t["super_totalClinics"], orgs.length],
          [t["super_activeClinics"], orgs.filter((org) => org.status === "active").length],
          [t["super_pendingClinics"], orgs.filter((org) => org.status === "pending").length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {orgs.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">{t["super_noOrgs"]}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">{t["super_orgs"]}</th>
                  <th className="px-5 py-3">{t["super_status"]}</th>
                  <th className="px-5 py-3">{t["super_plan"]}</th>
                  <th className="px-5 py-3">{t["super_usage"]}</th>
                  <th className="px-5 py-3">{t["super_created"]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {orgs.map((org) => (
                  <tr key={org.id} className="align-top hover:bg-muted/40">
                    <td className="px-5 py-4">
                      <Link href={`/super/clinics/${org.id}`} className="font-semibold text-foreground hover:text-primary">
                        {org.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {org.slug ?? "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4">{statusBadge(org.status)}</td>
                    <td className="px-5 py-4 font-semibold capitalize text-foreground">{org.plan}</td>
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
          <div key={org.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold text-foreground">{org.name}</p><p className="text-xs text-muted-foreground">{org.users[0]?.email ?? org.slug}</p></div>
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
          <div key={org.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold text-foreground">{org.name}</p><p className="text-xs text-muted-foreground">{org.plan} → <span className="font-semibold text-accent-blue-text">{org.upgradeRequestedPlan}</span></p></div>
              <span className="rounded-full bg-accent-blue-bg px-2.5 py-1 text-xs font-semibold text-accent-blue-text">{t["super_upgradeRequested"]}</span>
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
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 space-y-3">{empty ? <p className="rounded-md border border-border/50 bg-muted/40 p-6 text-center text-sm text-muted-foreground">{emptyText}</p> : children}</div>
    </div>
  );
}

function BillingSection({ orgs, t, busyId, act, plans }: { orgs: OrgRow[]; t: Dictionary; busyId: string | null; act: (path: string, body: Record<string, unknown>) => Promise<void>; plans: PlanOption[] }) {
  return (
    <section className="mt-6 space-y-4">
      <div><h2 className="text-xl font-semibold text-foreground">{t["super_sectionBilling"]}</h2><p className="text-sm text-muted-foreground">{t["super_billingHelp"]}</p></div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground"><th className="px-5 py-3">{t["super_orgs"]}</th><th className="px-5 py-3">{t["super_plan"]}</th><th className="px-5 py-3">{t["super_setPlan"]}</th></tr></thead>
            <tbody className="divide-y divide-border/50">
              {orgs.map((org) => <tr key={org.id}><td className="px-5 py-4 font-semibold text-foreground">{org.name}</td><td className="px-5 py-4 capitalize text-foreground">{org.plan}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{plans.map((plan) => <button key={plan.code} disabled={busyId !== null} onClick={() => void act(`/api/super/orgs/${org.id}/plan`, { plan: plan.code })} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition disabled:opacity-50 ${org.plan === plan.code ? "bg-primary text-primary-foreground" : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{plan.nameEn ?? plan.code}</button>)}</div></td></tr>)}
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
      <div><h2 className="text-xl font-semibold text-foreground">{t["super_sectionAudit"]}</h2><p className="text-sm text-muted-foreground">{t["super_auditHelp"]}</p></div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {audit.length === 0 ? <p className="p-12 text-center text-sm text-muted-foreground">{t["super_noAudit"]}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground"><th className="px-5 py-3">{t["super_date"]}</th><th className="px-5 py-3">{t["super_action"]}</th><th className="px-5 py-3">{t["super_target"]}</th><th className="px-5 py-3">{t["super_actor"]}</th></tr></thead><tbody className="divide-y divide-border/50">{audit.map((log) => <tr key={log.id}><td className="px-5 py-4 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td><td className="px-5 py-4"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{log.action}</span></td><td className="px-5 py-4"><div className="font-semibold text-foreground">{log.entityType.replace("platform_", "")}</div><div className="text-xs text-muted-foreground">{log.organization.name}</div></td><td className="px-5 py-4 text-xs text-muted-foreground">{log.user?.name ?? log.user?.email ?? "System"}</td></tr>)}</tbody></table></div>}
      </div>
    </section>
  );
}

function SettingsSection({ settings, setSettings, saving, save, t, plans }: { settings: PlatformSettings; setSettings: React.Dispatch<React.SetStateAction<PlatformSettings>>; saving: boolean; save: () => Promise<void>; t: Dictionary; plans: PlanOption[] }) {
  return (
    <section className="mt-6 max-w-3xl space-y-4">
      <div><h2 className="text-xl font-semibold text-foreground">{t["super_sectionSettings"]}</h2><p className="text-sm text-muted-foreground">{t["super_settingsHelp"]}</p></div>
      <div className="space-y-5 rounded-lg border border-border bg-card p-6">
        <label className="flex items-center justify-between gap-4"><span><span className="block font-semibold text-foreground">{t["super_maintenanceMode"]}</span><span className="text-xs text-muted-foreground">{t["super_maintenanceHelp"]}</span></span><input type="checkbox" checked={settings.maintenanceMode} onChange={(event) => setSettings((current) => ({ ...current, maintenanceMode: event.target.checked }))} className="size-5 accent-primary" /></label>
        <label className="flex items-center justify-between gap-4"><span><span className="block font-semibold text-foreground">{t["super_allowSignups"]}</span><span className="text-xs text-muted-foreground">{t["super_allowSignupsHelp"]}</span></span><input type="checkbox" checked={settings.allowClinicSignups} onChange={(event) => setSettings((current) => ({ ...current, allowClinicSignups: event.target.checked }))} className="size-5 accent-primary" /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold text-foreground">{t["super_defaultPlan"]}</span><select value={settings.defaultPlan} onChange={(event) => setSettings((current) => ({ ...current, defaultPlan: event.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring">{plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.nameEn ?? plan.code}</option>)}</select></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold text-foreground">{t["super_supportEmail"]}</span><input value={settings.supportEmail} onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring" /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold text-foreground">{t["super_announcement"]}</span><textarea value={settings.announcement} onChange={(event) => setSettings((current) => ({ ...current, announcement: event.target.value }))} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring" /></label>
        <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? t["common_saving"] : t["common_save"]}</button>
      </div>
    </section>
  );
}

function ActionButton({ children, onClick, disabled, variant, icon }: { children: React.ReactNode; onClick: () => void; disabled: boolean; variant: "success" | "danger"; icon: React.ReactNode }) {
  return <button disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${variant === "success" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-critical-border bg-critical-bg text-critical-text hover:bg-critical-border/20"}`}>{icon}{children}</button>;
}
