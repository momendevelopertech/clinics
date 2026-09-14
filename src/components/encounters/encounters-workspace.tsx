"use client";
import { CheckCheck, FileText, Plus, Save, Trash2 } from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { isSoapEmpty, prefillSoap } from "@/lib/clinical-templates";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { AiAssistCard } from "@/components/encounters/ai-assist-card";
import { EncounterVitalsCard } from "@/components/encounters/encounter-vitals-card";
import { NewPrescriptionDialog } from "@/components/prescriptions/new-prescription-dialog";

export type SoapNote = { subjective: string; objective: string; assessment: string; plan: string };

const EMPTY_SOAP: SoapNote = { subjective: "", objective: "", assessment: "", plan: "" };

type Patient = { id: string; firstName: string; lastName: string; mrn: string };
type Encounter = {
  id: string;
  status: string;
  encounterType: string | null;
  startTime: string;
  patient: { id: string; firstName: string; lastName: string };
  notes: { id: string; text: string | null; assessment: string | null }[];
};

export function EncountersWorkspace() {
  const { t } = useLocale();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; specialty: string | null; subjective: string | null; objective: string | null; assessment: string | null; plan: string | null }>>([]);
  const [templateId, setTemplateId] = useState("");
  const [soapDrafts, setSoapDrafts] = useState<Record<string, SoapNote>>({});
  const soapFor = (id: string): SoapNote => soapDrafts[id] ?? EMPTY_SOAP;
  const setSoapFor = (id: string, value: SoapNote) =>
    setSoapDrafts((prev) => ({ ...prev, [id]: value }));
  const updateSoapFor = (id: string, patch: Partial<SoapNote>) =>
    setSoapDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_SOAP), ...patch } }));
  const [tplName, setTplName] = useState("");
  const [tplSpecialty, setTplSpecialty] = useState("");
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const refresh = useCallback(async () => {
    const [patientsResponse, encountersResponse, templatesResponse] = await Promise.all([fetch("/api/patients"), fetch("/api/encounters"), fetch("/api/clinical-templates")]);
    if (patientsResponse.status === 403 || encountersResponse.status === 403) {
      setForbidden(true);
      return;
    }
    if (!patientsResponse.ok || !encountersResponse.ok) throw new Error(t("enc_loadError"));
    setPatients((await patientsResponse.json()) as Patient[]);
    setEncounters((await encountersResponse.json()) as Encounter[]);
    if (templatesResponse.ok) setTemplates(await templatesResponse.json());
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    // Intentional fetch-on-mount: loads workspace data once. The cancelled
    // flag guards the async continuation, so this is not a render-loop setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : t("enc_loadError"));
    });
    // G3: deep-link from Queue (?appointmentId=&patientId=) pre-fills the
    // visit start so the reception -> doctor handoff is one click.
    try {
      const params = new URLSearchParams(window.location.search);
      const appt = params.get("appointmentId");
      const pat = params.get("patientId");
      if (appt) setAppointmentId(appt);
      if (pat) setPatientId(pat);
    } catch {
      /* ignore */
    }
    return () => { cancelled = true; };
  }, [refresh, t]);

  const startEncounter = async () => {
    if (!patientId) return;
    const response = await fetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, appointmentId, encounterType: "office_visit" }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || t("enc_startError"));
    }
    setPatientId("");
    setAppointmentId(null);
    // Clear the deep-link so a refresh does not re-create the same visit.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("appointmentId");
      url.searchParams.delete("patientId");
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* ignore */
    }
    await refresh();
    toast.success(t("common_added"));
  };

  const applyTemplate = (encounterId: string, id: string) => {
    setTemplateId(id);
    const tpl = templates.find((entry) => entry.id === id);
    if (tpl) setSoapFor(encounterId, prefillSoap(soapFor(encounterId), tpl));
  };

  const addSoapNote = async () => {
    if (!selectedId) return;
    const draft = soapFor(selectedId);
    if (isSoapEmpty(draft)) return;
    const response = await fetch(`/api/encounters/${selectedId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType: "soap", ...draft }),
    });
    if (!response.ok) throw new Error(t("enc_noteError"));
    setSoapFor(selectedId, { ...EMPTY_SOAP });
    setTemplateId("");
    await refresh();
    toast.success(t("common_added"));
  };

  const saveTemplate = async () => {
    const draft = selectedId ? soapFor(selectedId) : EMPTY_SOAP;
    if (!tplName.trim() || isSoapEmpty(draft)) return;
    const response = await fetch("/api/clinical-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tplName.trim(), specialty: tplSpecialty.trim() || null, ...draft }),
    });
    if (!response.ok) throw new Error(t("enc_tplSaveError"));
    setTplName("");
    setTplSpecialty("");
    await refresh();
    toast.success(t("common_saved"));
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm(t("common_confirmDelete"))) return;
    const response = await fetch(`/api/clinical-templates/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("enc_tplDeleteError"));
    if (templateId === id) setTemplateId("");
    await refresh();
    toast.success(t("common_deleted"));
  };

  const complete = async (id: string) => {
    const response = await fetch(`/api/encounters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (!response.ok) throw new Error(t("enc_completeError"));
    const data = (await response.json().catch(() => null)) as {
      autoInvoice?: { invoiceNumber: string; totalAmount: string } | null;
    } | null;
    await refresh();
    toast.success(
      data?.autoInvoice
        ? `${t("common_saved")} · ${t("billing_title")}: ${data.autoInvoice.invoiceNumber}`
        : t("common_saved"),
    );
  };

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("enc_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("enc_subtitle")}</p>
        </div>
        <PermissionDenied
          title={t("enc_forbiddenTitle") ?? "You don't have permission"}
          description={t("enc_forbidden") ?? "Only clinical roles can open encounters."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("enc_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("enc_subtitle")}</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader><CardTitle>{t("enc_start")}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FeatureTip tipId="encounters-charting">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="encounter-patient">{t("enc_patient")}</Label>
            <SearchableSelect
              id="encounter-patient"
              value={patientId}
              onValueChange={(value) => { setPatientId(value); if (!value) setAppointmentId(null); }}
              options={[
                { value: "", label: t("enc_selectPatient") },
                ...patients.map((patient) => ({
                  value: patient.id,
                  label: `${patient.firstName} ${patient.lastName} · ${patient.mrn}`,
                })),
              ]}
              placeholder={t("enc_selectPatient")}
              triggerClassName="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
            {appointmentId ? (
              <p className="text-[11px] text-muted-foreground">{t("enc_linkedAppointment")}: {appointmentId.slice(0, 8)}…</p>
            ) : null}
          </div>
          </FeatureTip>
          <Button onClick={() => void startEncounter().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_startError")))}><Plus className="mr-1.5 h-4 w-4" />{t("enc_start")}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("enc_recent")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {encounters.map((encounter) => (
            <div key={encounter.id} className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{encounter.patient.firstName} {encounter.patient.lastName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{encounter.encounterType ?? "office_visit"}</span>
                    <span>·</span>
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                      encounter.status === "completed"
                        ? "bg-success-bg text-success-text"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {encounter.status}
                    </span>
                  </p>
                </div>
                {encounter.status === "in_progress" ? <Button size="sm" onClick={() => void complete(encounter.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_completeError")))}><CheckCheck className="mr-1.5 h-4 w-4" />{t("enc_complete")}</Button> : null}
              </div>
              {encounter.notes.map((entry) => <p key={entry.id} className="mt-3 whitespace-pre-wrap text-sm text-foreground bg-muted-bg p-3 rounded-md border border-border">{entry.text ?? entry.assessment}</p>)}
              <div className="mt-3">
                <EncounterVitalsCard
                  patientId={encounter.patient.id}
                  encounterId={encounter.id}
                  patientLabel={`${encounter.patient.firstName} ${encounter.patient.lastName}`}
                  onSaved={() => void refresh().catch(() => undefined)}
                />
              </div>
              {encounter.status === "in_progress" ? (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <SearchableSelect
                      value={selectedId === encounter.id ? templateId : ""}
                      onValueChange={(value) => { setSelectedId(encounter.id); applyTemplate(encounter.id, value); }}
                      options={[
                        { value: "", label: t("enc_tplSelect") },
                        ...templates.map((tpl) => ({
                          value: tpl.id,
                          label: tpl.specialty ? `${tpl.name} · ${tpl.specialty}` : tpl.name,
                        })),
                      ]}
                      placeholder={t("enc_tplSelect")}
                      triggerClassName="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5"><Label className="text-xs font-semibold">{t("enc_soapSubjective")}</Label><Textarea value={soapFor(encounter.id).subjective} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); updateSoapFor(encounter.id, { subjective: event.target.value }); }} placeholder={t("enc_soapSubjective")} /></div>
                    <div className="grid gap-1.5"><Label className="text-xs font-semibold">{t("enc_soapObjective")}</Label><Textarea value={soapFor(encounter.id).objective} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); updateSoapFor(encounter.id, { objective: event.target.value }); }} placeholder={t("enc_soapObjective")} /></div>
                    <div className="grid gap-1.5"><Label className="text-xs font-semibold">{t("enc_soapAssessment")}</Label><Textarea value={soapFor(encounter.id).assessment} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); updateSoapFor(encounter.id, { assessment: event.target.value }); }} placeholder={t("enc_soapAssessment")} /></div>
                    <div className="grid gap-1.5"><Label className="text-xs font-semibold">{t("enc_soapPlan")}</Label><Textarea value={soapFor(encounter.id).plan} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); updateSoapFor(encounter.id, { plan: event.target.value }); }} placeholder={t("enc_soapPlan")} /></div>
                  </div>
                  <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => void addSoapNote().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_noteError")))}><FileText className="mr-1.5 h-4 w-4" />{t("enc_addNote")}</Button>{!isSoapEmpty(soapFor(encounter.id)) ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning" /> : null}</div>
                  <AiAssistCard encounterId={encounter.id} soap={soapFor(encounter.id)} setSoap={(value) => setSoapFor(encounter.id, value)} />
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3 bg-muted-bg">
                    <div><p className="text-sm font-semibold text-foreground">{t("rx_cardTitle")}</p><p className="text-xs text-muted-foreground">{t("rx_cardDesc")}</p></div>
                    <NewPrescriptionDialog
                      onSuccess={() => { /* list page refreshes itself */ }}
                      defaultPatientId={encounter.patient.id}
                      defaultPatientLabel={`${encounter.patient.firstName} ${encounter.patient.lastName}`}
                      defaultEncounterId={encounter.id}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {!encounters.length ? <p className="text-sm text-muted-foreground">{t("enc_empty")}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("enc_tplTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-xs">
          <div><p className="text-sm font-semibold text-foreground">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.specialty ?? t("enc_tplGeneral")}</p></div>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteTemplate(tpl.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_tplDeleteError")))}><Trash2 className="mr-1.5 h-4 w-4" />{t("common_delete")}</Button>
          </div>
        ))}
        {!templates.length ? <p className="text-sm text-muted-foreground">{t("enc_tplEmpty")}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label className="text-xs font-semibold">{t("enc_tplName")}</Label><Textarea value={tplName} onChange={(event) => setTplName(event.target.value)} placeholder={t("enc_tplName")} /></div>
          <div className="grid gap-1.5"><Label className="text-xs font-semibold">{t("enc_tplSpecialty")}</Label><Textarea value={tplSpecialty} onChange={(event) => setTplSpecialty(event.target.value)} placeholder={t("enc_tplSpecialty")} /></div>
        </div>
        <div><Button variant="outline" size="sm" onClick={() => void saveTemplate().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_tplSaveError")))}><Save className="mr-1.5 h-4 w-4" />{t("enc_tplSave")}</Button></div>
        <p className="text-xs text-muted-foreground">{t("enc_tplSaveHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
