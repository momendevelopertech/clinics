"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { FeatureTip } from "@/components/feature-tips/feature-tip";

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
  const [note, setNote] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const refresh = useCallback(async () => {
    const [patientsResponse, encountersResponse] = await Promise.all([fetch("/api/patients"), fetch("/api/encounters")]);
    if (patientsResponse.status === 403 || encountersResponse.status === 403) {
      setForbidden(true);
      return;
    }
    if (!patientsResponse.ok || !encountersResponse.ok) throw new Error(t("enc_loadError"));
    setPatients((await patientsResponse.json()) as Patient[]);
    setEncounters((await encountersResponse.json()) as Encounter[]);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      const [patientsResponse, encountersResponse] = await Promise.all([fetch("/api/patients"), fetch("/api/encounters")]);
      if (patientsResponse.status === 403 || encountersResponse.status === 403) {
        if (!cancelled) setForbidden(true);
        return;
      }
      if (!patientsResponse.ok || !encountersResponse.ok) throw new Error(t("enc_loadError"));
      if (!cancelled) {
        setPatients((await patientsResponse.json()) as Patient[]);
        setEncounters((await encountersResponse.json()) as Encounter[]);
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

  const addNote = async () => {
    if (!selectedId || !note.trim()) return;
    const response = await fetch(`/api/encounters/${selectedId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType: "freeform", text: note.trim() }),
    });
    if (!response.ok) throw new Error(t("enc_noteError"));
    setNote("");
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
                <div className="mt-3 flex gap-2">
                  <Textarea value={selectedId === encounter.id ? note : ""} onFocus={() => setSelectedId(encounter.id)} onChange={(event) => { setSelectedId(encounter.id); setNote(event.target.value); }} placeholder={t("enc_notePlaceholder")} />
                  <Button variant="outline" onClick={() => void addNote().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("enc_noteError")))}>{t("enc_addNote")}</Button>
                </div>
              ) : null}
            </div>
          ))}
          {!encounters.length ? <p className="text-sm text-muted-foreground">{t("enc_empty")}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
