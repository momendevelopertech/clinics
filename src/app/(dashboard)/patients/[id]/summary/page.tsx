"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SummaryVitals {
  bloodPressure: string | null;
  heartRate: number | null;
  weightKg: number | null;
  recordedAt: string | null;
}

interface SummaryItem {
  name: string;
  status?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  date?: string | null;
}

interface PatientSummary {
  id: string;
  name: string;
  mrn: string | null;
  dob: string | null;
  phone: string | null;
  email: string | null;
  diagnoses: SummaryItem[];
  medications: SummaryItem[];
  latestVitals: SummaryVitals | null;
  lastVisit: string | null;
  qrUrl: string;
}

export default function PatientSummaryPage() {
  const params = useParams<{ id: string }>();
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/patients/${params.id}/summary`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch(() => setError("Failed to load summary"));
  }, [params?.id]);

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>;
  }

  if (!summary) {
    return <div className="p-6 text-sm text-muted-foreground">Loading summary…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Patient summary</h1>
            <p className="text-sm text-muted-foreground">MRN: {summary.mrn ?? "—"}</p>
          </div>
          {summary.qrUrl ? (
            <img src={summary.qrUrl} alt="Patient QR code" className="h-28 w-28 rounded-md border border-border bg-white p-2" />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 font-semibold text-foreground">Patient details</h2>
          <ul className="space-y-2 text-sm text-foreground">
            <li><strong className="font-medium text-muted-foreground">Name:</strong> {summary.name}</li>
            <li><strong className="font-medium text-muted-foreground">DOB:</strong> {summary.dob ? new Date(summary.dob).toLocaleDateString() : "—"}</li>
            <li><strong className="font-medium text-muted-foreground">Phone:</strong> {summary.phone ?? "—"}</li>
            <li><strong className="font-medium text-muted-foreground">Email:</strong> {summary.email ?? "—"}</li>
            <li><strong className="font-medium text-muted-foreground">Last visit:</strong> {summary.lastVisit ? new Date(summary.lastVisit).toLocaleDateString() : "—"}</li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 font-semibold text-foreground">Vitals</h2>
          {summary.latestVitals ? (
            <ul className="space-y-2 text-sm text-foreground">
              <li><strong className="font-medium text-muted-foreground">BP:</strong> {summary.latestVitals.bloodPressure ?? "—"}</li>
              <li><strong className="font-medium text-muted-foreground">Heart rate:</strong> {summary.latestVitals.heartRate ?? "—"}</li>
              <li><strong className="font-medium text-muted-foreground">Weight:</strong> {summary.latestVitals.weightKg ? `${summary.latestVitals.weightKg} kg` : "—"}</li>
              <li><strong className="font-medium text-muted-foreground">Recorded:</strong> {summary.latestVitals.recordedAt ? new Date(summary.latestVitals.recordedAt).toLocaleString() : "—"}</li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No vitals recorded.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-3 font-semibold text-foreground">Diagnoses</h2>
        {summary.diagnoses.length ? (
          <ul className="space-y-2 text-sm text-foreground">
            {summary.diagnoses.map((item: SummaryItem, index: number) => (
              <li key={`${item.name}-${index}`}>• {item.name} {item.status ? `(${item.status})` : ""}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No diagnoses available.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-3 font-semibold text-foreground">Medications</h2>
        {summary.medications.length ? (
          <ul className="space-y-2 text-sm text-foreground">
            {summary.medications.map((item: SummaryItem, index: number) => (
              <li key={`${item.name}-${index}`}>• {item.name} {item.dosage ? `· ${item.dosage}` : ""} {item.frequency ? `· ${item.frequency}` : ""}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No medication list available.</p>
        )}
      </div>
    </div>
  );
}
