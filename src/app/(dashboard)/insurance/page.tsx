"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Check,
  FileText,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { canTransitionClaim } from "@/lib/insurance";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { useRoles } from "@/context/RoleContext";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { DataSourceLink } from "@/components/data-source/data-source-navigator";
import { DATA_SOURCES } from "@/components/data-source/sources";
import { usePermissionState } from "@/hooks/use-permission-state";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

type Patient = { id: string; firstName: string; lastName: string };
type Policy = {
  id: string;
  patientId: string;
  provider: string;
  policyNumber: string;
  groupNumber: string | null;
  type: string;
};
type Provider = {
  id: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  active: boolean;
};
type Claim = {
  id: string;
  patientId: string;
  invoiceId: string | null;
  amountClaimed: number | string;
  amountPaid: number | string | null;
  status: string;
  denialReason: string | null;
  patient?: { firstName: string; lastName: string } | null;
  invoice?: { invoiceNumber: string } | null;
};

const CLAIM_STATUSES = ["submitted", "pending", "paid", "denied", "appeal"] as const;

const PAGE_SIZE = 10;

export default function InsurancePage() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const { roles } = useRoles();
  const isOwner = roles.includes("Owner") || roles.includes("Super Admin");
  const { forbidden, guardedFetch } = usePermissionState();
  const [tab, setTab] = React.useState<"policies" | "claims">("policies");
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [claims, setClaims] = React.useState<Claim[]>([]);
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [patientFilter, setPatientFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [eligibility, setEligibility] = React.useState<Record<string, { eligible: boolean; reasons: string[] }>>({});
  const [checkingId, setCheckingId] = React.useState<string | null>(null);

  const [policyForm, setPolicyForm] = React.useState({
    patientId: "",
    provider: "",
    policyNumber: "",
    groupNumber: "",
    type: "primary",
  });
  const [claimForm, setClaimForm] = React.useState({
    patientId: "",
    invoiceId: "",
    amountClaimed: "",
  });
  const [providerForm, setProviderForm] = React.useState({ name: "", contactPhone: "", contactEmail: "" });
  const [editingProviderId, setEditingProviderId] = React.useState<string | null>(null);
  const [advancing, setAdvancing] = React.useState<Record<string, string>>({});
  const [amountPaid, setAmountPaid] = React.useState<Record<string, string>>({});

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [patientsData, policiesData, claimsData, providersData] = await Promise.all([
        guardedFetch<Patient[] | { patients: Patient[] }>("/api/patients"),
        guardedFetch<{ policies: Policy[] }>("/api/insurance/policies"),
        guardedFetch<{ claims: Claim[] }>("/api/insurance/claims"),
        guardedFetch<{ providers: Provider[] }>("/api/insurance/providers"),
      ]);
      if (patientsData) {
        setPatients(
          Array.isArray(patientsData)
            ? patientsData
            : Array.isArray(patientsData.patients)
              ? patientsData.patients
              : [],
        );
      }
      if (policiesData) setPolicies(policiesData.policies ?? []);
      if (claimsData) setClaims(claimsData.claims ?? []);
      if (providersData) setProviders(providersData.providers ?? []);
    } catch (error) {
      logClientError("Insurance load failed", error);
    } finally {
      setLoading(false);
    }
  }, [guardedFetch]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const patientName = (id: string) => {
    const p = patients.find((item) => item.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "—";
  };

  const activeProviders = providers.filter((p) => p.active);
  const filteredPolicies = policies.filter(
    (p) => patientFilter === "all" || p.patientId === patientFilter,
  );
  const filteredClaims = claims.filter(
    (c) =>
      (patientFilter === "all" || c.patientId === patientFilter) &&
      (statusFilter === "all" || c.status === statusFilter),
  );
  const policyPageCount = Math.max(1, Math.ceil(filteredPolicies.length / PAGE_SIZE));
  const claimPageCount = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE));
  const pagedPolicies = paginate(filteredPolicies, Math.min(page, policyPageCount), PAGE_SIZE);
  const pagedClaims = paginate(filteredClaims, Math.min(page, claimPageCount), PAGE_SIZE);
  const visibleCount = tab === "policies" ? filteredPolicies.length : filteredClaims.length;
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(visibleCount / PAGE_SIZE)));

  async function createPolicy() {
    try {
      const r = await fetch("/api/insurance/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: policyForm.patientId,
          provider: policyForm.provider,
          policyNumber: policyForm.policyNumber,
          groupNumber: policyForm.groupNumber || undefined,
          type: policyForm.type,
        }),
      });
      if (!r.ok) throw new Error("create failed");
      triggerGuidance("insurance_policy_created", t("ins_policyCreated"));
      setPolicyForm({ patientId: "", provider: "", policyNumber: "", groupNumber: "", type: "primary" });
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Policy create failed", error);
    }
  }

  async function saveProvider() {
    if (!providerForm.name.trim()) {
      toast.error(t("catalogs_required"));
      return;
    }
    try {
      const payload = {
        name: providerForm.name.trim(),
        contactPhone: providerForm.contactPhone.trim() || null,
        contactEmail: providerForm.contactEmail.trim() || null,
      };
      if (editingProviderId) {
        const r = await fetch(`/api/insurance/providers/${editingProviderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("update failed");
        triggerGuidance("insurance_policy_created", t("ins_providerUpdated"));
      } else {
        const r = await fetch("/api/insurance/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("create failed");
        triggerGuidance("insurance_policy_created", t("ins_providerCreated"));
      }
      setProviderForm({ name: "", contactPhone: "", contactEmail: "" });
      setEditingProviderId(null);
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Provider save failed", error);
    }
  }

  async function deleteProvider(id: string) {
    if (!window.confirm(t("common_confirmDelete"))) return;
    try {
      const r = await fetch(`/api/insurance/providers/${id}`, { method: "DELETE" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error("delete failed");
      triggerGuidance("insurance_policy_created", (data as { deactivated?: boolean }).deactivated ? t("ins_providerDeactivated") : t("common_deleted"));
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Provider delete failed", error);
    }
  }

  async function checkEligibility(policyId: string) {
    try {
      setCheckingId(policyId);
      const r = await fetch(`/api/insurance/policies/${policyId}/eligibility`);
      if (!r.ok) throw new Error("eligibility failed");
      const data = await r.json();
      setEligibility((prev) => ({
        ...prev,
        [policyId]: { eligible: data.eligible === true, reasons: data.reasons ?? [] },
      }));
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Eligibility check failed", error);
    } finally {
      setCheckingId(null);
    }
  }

  async function fileClaim() {
    try {
      const r = await fetch("/api/insurance/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: claimForm.patientId,
          invoiceId: claimForm.invoiceId || undefined,
          amountClaimed: Number(claimForm.amountClaimed),
        }),
      });
      if (!r.ok) throw new Error("file failed");
      triggerGuidance("insurance_claim_filed", t("ins_claimFiled"));
      setClaimForm({ patientId: "", invoiceId: "", amountClaimed: "" });
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Claim file failed", error);
    }
  }

  async function advanceClaim(claim: Claim) {
    const next = advancing[claim.id];
    if (!next) return;
    try {
      const r = await fetch(`/api/insurance/claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          amountPaid: next === "paid" && amountPaid[claim.id] ? Number(amountPaid[claim.id]) : undefined,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? "transition failed");
      triggerGuidance("insurance_claim_filed", t("common_success"));
      setAdvancing((prev) => ({ ...prev, [claim.id]: "" }));
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common_error"));
      logClientError("Claim transition failed", error);
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav_insurance")}</h1>
        <PermissionDenied
          title={t("ins_forbiddenTitle") ?? "You don't have permission"}
          description={t("ins_forbidden") ?? "Only staff with billing access can view insurance."}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <UpgradePrompt moduleKey="billing" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            {t("nav_insurance")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("ins_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {(["policies", "claims"] as const).map((key) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
            >
              {key === "policies" ? <ShieldCheck className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{t(`ins_tab_${key}`)}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="grid gap-2 w-full sm:w-64">
              <Label>{t("common_patient")}</Label>
              <SearchableSelect
                value={patientFilter}
                onValueChange={(v) => {
                  setPatientFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: t("common_all") },
                  ...patients.map((p) => ({
                    value: p.id,
                    label: `${p.firstName} ${p.lastName}`,
                  })),
                ]}
                placeholder={t("common_all")}
                triggerClassName="h-9"
              />
            </div>
            {tab === "claims" ? (
              <div className="grid gap-2 w-full sm:w-48">
                <Label>{t("common_status")}</Label>
                <SearchableSelect
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: t("common_all") },
                    ...CLAIM_STATUSES.map((s) => ({
                      value: s,
                      label: t(`ins_claim_${s}`),
                    })),
                  ]}
                  placeholder={t("common_all")}
                  triggerClassName="h-9"
                />
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">{t("common_loading")}</div>
          ) : tab === "policies" ? (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted-bg text-muted-foreground font-medium">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("common_patient")}</th>
                    <th className="px-4 py-3 text-start">{t("ins_colProvider")}</th>
                    <th className="px-4 py-3 text-start">{t("ins_colPolicyNumber")}</th>
                    <th className="px-4 py-3 text-start">{t("common_type")}</th>
                    <th className="px-4 py-3 text-start">{t("ins_colEligibility")}</th>
                    <th className="px-4 py-3 text-start">{t("common_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {pagedPolicies.map((p) => (
                    <tr key={p.id} className="hover:bg-muted-bg/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{patientName(p.patientId)}</td>
                      <td className="px-4 py-3">{p.provider}</td>
                      <td className="px-4 py-3 font-mono">{p.policyNumber}</td>
                      <td className="px-4 py-3">{t(`ins_type_${p.type}`) === `ins_type_${p.type}` ? p.type : t(`ins_type_${p.type}`)}</td>
                      <td className="px-4 py-3">
                        {eligibility[p.id] ? (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              eligibility[p.id].eligible
                                ? "bg-success-bg text-success-text"
                                : "bg-critical-bg text-critical-text",
                            )}
                          >
                            {eligibility[p.id].eligible
                              ? t("ins_eligible")
                              : `${t("ins_ineligible")}: ${eligibility[p.id].reasons.join(", ")}`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          disabled={checkingId === p.id}
                          onClick={() => void checkEligibility(p.id)}
                        >
                          <Search className="h-3.5 w-3.5 mr-1" />{t("ins_checkEligibility")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPolicies.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{t("ins_emptyPolicies")}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted-bg text-muted-foreground font-medium">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("common_patient")}</th>
                    <th className="px-4 py-3 text-start">{t("ins_colClaimed")}</th>
                    <th className="px-4 py-3 text-start">{t("common_status")}</th>
                    <th className="px-4 py-3 text-start">{t("ins_colAdvance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {pagedClaims.map((c) => {
                    const nextOptions = CLAIM_STATUSES.filter((s) => canTransitionClaim(c.status, s));
                    return (
                      <tr key={c.id} className="hover:bg-muted-bg/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : patientName(c.patientId)}
                          {c.invoice ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {c.invoice.invoiceNumber}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">${Number(c.amountClaimed).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {t(`ins_claim_${c.status}`) === `ins_claim_${c.status}` ? c.status : t(`ins_claim_${c.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {nextOptions.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <SearchableSelect
                                value={advancing[c.id] ?? ""}
                                onValueChange={(v) => setAdvancing((prev) => ({ ...prev, [c.id]: v }))}
                                options={nextOptions.map((s) => ({
                                  value: s,
                                  label: t(`ins_claim_${s}`) === `ins_claim_${s}` ? s : t(`ins_claim_${s}`),
                                }))}
                                placeholder={t("ins_colAdvance")}
                                triggerClassName="w-36 h-8 text-xs"
                              />
                              {advancing[c.id] === "paid" ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-28 h-8 text-xs"
                                  placeholder={t("ins_colPaid")}
                                  value={amountPaid[c.id] ?? ""}
                                  onChange={(e) => setAmountPaid((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                />
                              ) : null}
                              <Button size="sm" className="h-8" disabled={!advancing[c.id]} onClick={() => void advanceClaim(c)}>
                                <Check className="h-3.5 w-3.5 mr-1" />{t("common_confirm")}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredClaims.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{t("ins_emptyClaims")}</p>
              ) : null}
            </div>
          )}
          {visibleCount > PAGE_SIZE ? (
            <DataPagination
              page={visiblePage}
              pageSize={PAGE_SIZE}
              total={visibleCount}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">{t("ins_providers")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!isOwner ? (
            <p className="text-xs text-muted-foreground">{t("ins_ownerOnlyProviders")}</p>
          ) : null}
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ds_noProviders")}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2.5 text-sm">
                  <span>
                    <span className="font-medium">{provider.name}</span>
                    {!provider.active ? <span className="ms-2 text-[11px] text-muted-foreground">({t("ds_inactive")})</span> : null}
                    {provider.contactPhone || provider.contactEmail ? (
                      <span className="block text-xs text-muted-foreground">
                        {[provider.contactPhone, provider.contactEmail].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  {isOwner ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        aria-label={t("common_edit")}
                        onClick={() => {
                          setProviderForm({
                            name: provider.name,
                            contactPhone: provider.contactPhone ?? "",
                            contactEmail: provider.contactEmail ?? "",
                          });
                          setEditingProviderId(provider.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        aria-label={t("common_delete")}
                        onClick={() => void deleteProvider(provider.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {isOwner ? (
            <div className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-4">
              <div className="grid gap-1">
                <Label>{t("ins_colProvider")}</Label>
                <Input value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} className="h-9" />
              </div>
              <div className="grid gap-1">
                <Label>{t("common_phone")}</Label>
                <Input value={providerForm.contactPhone} onChange={(e) => setProviderForm({ ...providerForm, contactPhone: e.target.value })} className="ltr-on-rtl h-9" />
              </div>
              <div className="grid gap-1">
                <Label>{t("common_email")}</Label>
                <Input value={providerForm.contactEmail} onChange={(e) => setProviderForm({ ...providerForm, contactEmail: e.target.value })} className="ltr-on-rtl h-9" />
              </div>
              <div className="flex items-end gap-2">
                {editingProviderId ? (
                  <Button type="button" variant="outline" className="h-9" onClick={() => { setProviderForm({ name: "", contactPhone: "", contactEmail: "" }); setEditingProviderId(null); }}>
                    {t("common_cancel")}
                  </Button>
                ) : null}
                <Button type="button" className="h-9" onClick={() => void saveProvider()}>
                  <Plus className="h-4 w-4 mr-1" />{editingProviderId ? t("common_save") : t("common_add")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">{t("ins_newPolicy")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label>{t("common_patientRequired")}</Label>
              <SearchableSelect value={policyForm.patientId} onValueChange={(v) => setPolicyForm({ ...policyForm, patientId: v })} options={patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} placeholder={t("common_selectPatient")} triggerClassName="h-9" />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1">
                {t("ds_providerFromList")}
                <DataSourceLink
                  href={DATA_SOURCES["insurance-provider"].href}
                  pageRoles={DATA_SOURCES["insurance-provider"].pageRoles}
                  managerLabel={DATA_SOURCES["insurance-provider"].managerLabel}
                />
              </Label>
              {activeProviders.length > 0 ? (
                <SearchableSelect
                  value={policyForm.provider}
                  onValueChange={(v) => setPolicyForm({ ...policyForm, provider: v })}
                  options={activeProviders.map((p) => ({ value: p.name, label: p.name }))}
                  placeholder={t("ds_pickProvider")}
                  triggerClassName="h-9"
                />
              ) : (
                <>
                  <Input value={policyForm.provider} onChange={(e) => setPolicyForm({ ...policyForm, provider: e.target.value })} className="h-9" />
                  <p className="text-[11px] text-warning-text">{t("ds_noProviders")}</p>
                </>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("ins_colPolicyNumber")}</Label>
                <Input value={policyForm.policyNumber} onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })} className="h-9" />
              </div>
              <div className="grid gap-2">
                <Label>
                  {t("ins_colGroupNumber")} ({t("common_optional")})
                </Label>
                <Input value={policyForm.groupNumber} onChange={(e) => setPolicyForm({ ...policyForm, groupNumber: e.target.value })} className="h-9" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("common_type")}</Label>
              <SearchableSelect value={policyForm.type} onValueChange={(v) => setPolicyForm({ ...policyForm, type: v })} options={[{ value: "primary", label: t("ins_type_primary") }, { value: "secondary", label: t("ins_type_secondary") }]} triggerClassName="h-9" />
            </div>
            <div>
              <Button
                disabled={!policyForm.patientId || !policyForm.provider.trim() || !policyForm.policyNumber.trim()}
                onClick={() => void createPolicy()}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-1" />{t("common_add")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">{t("ins_newClaim")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label>{t("common_patientRequired")}</Label>
              <SearchableSelect value={claimForm.patientId} onValueChange={(v) => setClaimForm({ ...claimForm, patientId: v })} options={patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} placeholder={t("common_selectPatient")} triggerClassName="h-9" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  {t("ins_colInvoice")} ({t("common_optional")})
                </Label>
                <Input
                  placeholder={t("ins_invoiceHint")}
                  value={claimForm.invoiceId}
                  onChange={(e) => setClaimForm({ ...claimForm, invoiceId: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("ins_colClaimed")}</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={claimForm.amountClaimed}
                  onChange={(e) => setClaimForm({ ...claimForm, amountClaimed: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <Button
                disabled={!claimForm.patientId || !(Number(claimForm.amountClaimed) > 0)}
                onClick={() => void fileClaim()}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-1" />{t("common_add")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
