"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { canTransitionClaim } from "@/lib/insurance";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
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
  const { forbidden, guardedFetch } = usePermissionState();
  const [tab, setTab] = React.useState<"policies" | "claims">("policies");
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [claims, setClaims] = React.useState<Claim[]>([]);
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
  const [advancing, setAdvancing] = React.useState<Record<string, string>>({});
  const [amountPaid, setAmountPaid] = React.useState<Record<string, string>>({});

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [patientsData, policiesData, claimsData] = await Promise.all([
        guardedFetch<Patient[] | { patients: Patient[] }>("/api/patients"),
        guardedFetch<{ policies: Policy[] }>("/api/insurance/policies"),
        guardedFetch<{ claims: Claim[] }>("/api/insurance/claims"),
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
      toast.success(t("ins_policyCreated"));
      setPolicyForm({ patientId: "", provider: "", policyNumber: "", groupNumber: "", type: "primary" });
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Policy create failed", error);
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
      toast.success(t("ins_claimFiled"));
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
      toast.success(t("common_success"));
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
              {t(`ins_tab_${key}`)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="grid gap-2 w-full sm:w-64">
              <Label>{t("common_patient")}</Label>
              <Select
                value={patientFilter}
                onValueChange={(v) => {
                  setPatientFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common_all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common_all")}</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tab === "claims" ? (
              <div className="grid gap-2 w-full sm:w-48">
                <Label>{t("common_status")}</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common_all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common_all")}</SelectItem>
                    {CLAIM_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`ins_claim_${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-neutral-500">{t("common_loading")}</div>
          ) : tab === "policies" ? (
            <div className="rounded-[5px] border overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("common_patient")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("ins_colProvider")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("ins_colPolicyNumber")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common_type")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("ins_colEligibility")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pagedPolicies.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-medium">{patientName(p.patientId)}</td>
                      <td className="px-4 py-3">{p.provider}</td>
                      <td className="px-4 py-3 font-mono">{p.policyNumber}</td>
                      <td className="px-4 py-3">{t(`ins_type_${p.type}`) === `ins_type_${p.type}` ? p.type : t(`ins_type_${p.type}`)}</td>
                      <td className="px-4 py-3">
                        {eligibility[p.id] ? (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              eligibility[p.id].eligible
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
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
                          disabled={checkingId === p.id}
                          onClick={() => void checkEligibility(p.id)}
                        >
                          {t("ins_checkEligibility")}
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
            <div className="rounded-[5px] border overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("common_patient")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("ins_colClaimed")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common_status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("ins_colAdvance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pagedClaims.map((c) => {
                    const nextOptions = CLAIM_STATUSES.filter((s) => canTransitionClaim(c.status, s));
                    return (
                      <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                        <td className="px-4 py-3 font-medium">
                          {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : patientName(c.patientId)}
                          {c.invoice ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {c.invoice.invoiceNumber}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">${Number(c.amountClaimed).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {t(`ins_claim_${c.status}`) === `ins_claim_${c.status}` ? c.status : t(`ins_claim_${c.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {nextOptions.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Select
                                value={advancing[c.id] ?? ""}
                                onValueChange={(v) => setAdvancing((prev) => ({ ...prev, [c.id]: v }))}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue placeholder={t("ins_colAdvance")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {nextOptions.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {t(`ins_claim_${s}`) === `ins_claim_${s}` ? s : t(`ins_claim_${s}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {advancing[c.id] === "paid" ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-28"
                                  placeholder={t("ins_colPaid")}
                                  value={amountPaid[c.id] ?? ""}
                                  onChange={(e) => setAmountPaid((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                />
                              ) : null}
                              <Button size="sm" disabled={!advancing[c.id]} onClick={() => void advanceClaim(c)}>
                                {t("common_confirm")}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("ins_newPolicy")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label>{t("common_patientRequired")}</Label>
              <Select value={policyForm.patientId} onValueChange={(v) => setPolicyForm({ ...policyForm, patientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common_selectPatient")} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("ins_colProvider")}</Label>
              <Input value={policyForm.provider} onChange={(e) => setPolicyForm({ ...policyForm, provider: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("ins_colPolicyNumber")}</Label>
                <Input value={policyForm.policyNumber} onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>
                  {t("ins_colGroupNumber")} ({t("common_optional")})
                </Label>
                <Input value={policyForm.groupNumber} onChange={(e) => setPolicyForm({ ...policyForm, groupNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("common_type")}</Label>
              <Select value={policyForm.type} onValueChange={(v) => setPolicyForm({ ...policyForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t("ins_type_primary")}</SelectItem>
                  <SelectItem value="secondary">{t("ins_type_secondary")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                disabled={!policyForm.patientId || !policyForm.provider.trim() || !policyForm.policyNumber.trim()}
                onClick={() => void createPolicy()}
              >
                {t("common_add")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("ins_newClaim")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label>{t("common_patientRequired")}</Label>
              <Select value={claimForm.patientId} onValueChange={(v) => setClaimForm({ ...claimForm, patientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common_selectPatient")} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                />
              </div>
            </div>
            <div>
              <Button
                disabled={!claimForm.patientId || !(Number(claimForm.amountClaimed) > 0)}
                onClick={() => void fileClaim()}
              >
                {t("common_add")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
