"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale/locale-provider";
import { isSoapEmpty, prefillSoap } from "@/lib/clinical-templates";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { AiAssistCard } from "@/components/encounters/ai-assist-card";

export type SoapNote = { subjective: string; objective: string; assessment: string; plan: string };

type Patient = { id: string; firstName: string; lastName: string; mrn: string };
type Encounter = {
  id: string;
  status: string;
  encounterType: string | null;
  startTime: string;
  patient: { firstName: string; lastName: string };
  notes: { id: string; text: string | null; assessment: string | null }[];
};

export function EncountersWorkspace() {
  const { t } = useLocale();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patientId, setPatientId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; specialty: string | null; subjective: string | null; objective: string | null; assessment: string | null; plan: string | null }>>([]);
  const [templateId, setTemplateId] = useState("");
  const [soap, setSoap] = useState<SoapNote>({ subjective: "", objective: "", assessment: "", plan: "" });
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
    async function loadInitialData() {
      const [patientsResponse, encountersResponse, templatesResponse] = await Promise.all([fetch("/api/patients"), fetch("/api/encounters"), fetch("/api/clinical-templates")]);
      if (patientsResponse.status === 403 || encountersResponse.status === 403) {
        if (!cancelled) setForbidden(true);
        return;
      }
      if (!patientsResponse.ok || !encountersResponse.ok) throw new Error(t("enc_loadError"));
      if (!cancelled) {
        setPatients((await patientsResponse.json()) as Patient[]);
        setEncounters((await encountersResponse.json()) as Encounter[]);
        if (templatesResponse.ok) setTemplates(await templatesResponse.json());
      }
    }
    void loadInitialData().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : t("enc_loadError"));
    });
    return () => { cancelled = true; };
  }, [t]);

  const startEncounter = async () => {
    if (!patientId) return;
    const response = await fetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, encounterType: "office_visit" }),
    });
    if (!response.ok) throw new Error(t("enc_startError"));
    setPatientId("");
    await refresh();
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((entry) => entry.id === id);
    if (tpl) setSoap((prev) => prefillSoap(prev, tpl));
  };

  const addSoapNote = async () => {
    if (!selectedId || isSoapEmpty(soap)) return;
    const response = await fetch(`/api/encounters/${selectedId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType: "soap", ...soap }),
    });
    if (!response.ok) throw new Error(t("enc_noteError"));
    setSoap({ subjective: "", objective: "", assessment: "", plan: "" });
    setTemplateId("");
    await refresh();
  };

  const saveTemplate = async () => {
    if (!tplName.trim() || isSoapEmpty(soap)) return;
    const response = await fetch("/api/clinical-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tplName.trim(), specialty: tplSpecialty.trim() || null, ...soap }),
    });
    if (!response.ok) throw new Error(t("enc_tplSaveError"));
    setTplName("");
    setTplSpecialty("");
    await refresh();
  };

  const deleteTemplate = async (id: string) => {
    const response = await fetch(`/api/clinical-templates/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("enc_tplDeleteError"));
    if (templateId === id) setTemplateId("");
    await refresh();
  };

  const complete = async (id: string) => {
    const response = await fetch(`/api/encounters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (!response.ok) throw new Error(t("enc_completeError"));
    await refresh();
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("enc_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("enc_subtitle")}</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Card>
        <CardHeader><CardTitle>{t("enc_start")}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FeatureTip tipId="encounters-charting">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="encounter-patient">{t("enc_patient")}</Label>
            <select id="encounter-patient" className="h-10 rounded-md border bg-background px-3 text-sm" value={patientId} onChange={(event) => setPatientId(event.target.value)}>
              <option value="">{t("enc_selectPatient")}</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName} · {patient.mrn}</option>)}
            </select>
          </div>
          </FeatureTip>
          <Button onClick={() => void startEncounter().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_startError")))}>{t("enc_start")}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("enc_recent")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {encounters.map((encounter) => (
            <div key={encounter.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-medium">{encounter.patient.firstName} {encounter.patient.lastName}</p><p className="text-xs text-muted-foreground">{encounter.encounterType ?? "office_visit"} · {encounter.status}</p></div>
                {encounter.status === "in_progress" ? <Button size="sm" onClick={() => void complete(encounter.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_completeError")))}>{t("enc_complete")}</Button> : null}
              </div>
              {encounter.notes.map((entry) => <p key={entry.id} className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{entry.text ?? entry.assessment}</p>)}
              {encounter.status === "in_progress" ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={selectedId === encounter.id ? templateId : ""} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); applyTemplate(event.target.value); }}>
                      <option value="">{t("enc_tplSelect")}</option>
                      {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}{tpl.specialty ? ` · ${tpl.specialty}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1"><Label>{t("enc_soapSubjective")}</Label><Textarea value={selectedId === encounter.id ? soap.subjective : ""} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); setSoap({ ...soap, subjective: event.target.value }); }} placeholder={t("enc_soapSubjective")} /></div>
                    <div className="grid gap-1"><Label>{t("enc_soapObjective")}</Label><Textarea value={selectedId === encounter.id ? soap.objective : ""} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); setSoap({ ...soap, objective: event.target.value }); }} placeholder={t("enc_soapObjective")} /></div>
                    <div className="grid gap-1"><Label>{t("enc_soapAssessment")}</Label><Textarea value={selectedId === encounter.id ? soap.assessment : ""} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); setSoap({ ...soap, assessment: event.target.value }); }} placeholder={t("enc_soapAssessment")} /></div>
                    <div className="grid gap-1"><Label>{t("enc_soapPlan")}</Label><Textarea value={selectedId === encounter.id ? soap.plan : ""} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); setSoap({ ...soap, plan: event.target.value }); }} placeholder={t("enc_soapPlan")} /></div>
                  </div>
                  <div><Button variant="outline" onClick={() => void addSoapNote().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_noteError")))}>{t("enc_addNote")}</Button></div>
                  <AiAssistCard encounterId={encounter.id} soap={soap} setSoap={setSoap} />
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
          <div key={tpl.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div><p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.specialty ?? t("enc_tplGeneral")}</p></div>
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void deleteTemplate(tpl.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_tplDeleteError")))}>{t("common_delete")}</Button>
          </div>
        ))}
        {!templates.length ? <p className="text-sm text-muted-foreground">{t("enc_tplEmpty")}</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1"><Label>{t("enc_tplName")}</Label><Textarea value={tplName} onChange={(event) => setTplName(event.target.value)} placeholder={t("enc_tplName")} /></div>
          <div className="grid gap-1"><Label>{t("enc_tplSpecialty")}</Label><Textarea value={tplSpecialty} onChange={(event) => setTplSpecialty(event.target.value)} placeholder={t("enc_tplSpecialty")} /></div>
        </div>
        <div><Button variant="outline" onClick={() => void saveTemplate().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_tplSaveError")))}>{t("enc_tplSave")}</Button></div>
        <p className="text-xs text-muted-foreground">{t("enc_tplSaveHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
