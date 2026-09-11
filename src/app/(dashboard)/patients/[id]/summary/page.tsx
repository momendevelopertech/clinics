"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PatientSummaryPage() {
  const params = useParams<{ id: string }>();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/patients/${params.id}/summary`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, [params?.id]);

  if (!summary) {
    return <div className="p-6 text-sm text-gray-500">Loading summary…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Patient summary</h1>
            <p className="text-sm text-gray-500">MRN: {summary.mrn ?? "—"}</p>
          </div>
          <img src={summary.qrUrl} alt="Patient QR code" className="h-28 w-28 rounded border bg-white p-2" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 font-semibold">Patient details</h2>
          <ul className="space-y-2 text-sm">
            <li><strong>Name:</strong> {summary.name}</li>
            <li><strong>DOB:</strong> {summary.dob ? new Date(summary.dob).toLocaleDateString() : "—"}</li>
            <li><strong>Phone:</strong> {summary.phone ?? "—"}</li>
            <li><strong>Email:</strong> {summary.email ?? "—"}</li>
            <li><strong>Last visit:</strong> {summary.lastVisit ? new Date(summary.lastVisit).toLocaleDateString() : "—"}</li>
          </ul>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 font-semibold">Vitals</h2>
          {summary.latestVitals ? (
            <ul className="space-y-2 text-sm">
              <li><strong>BP:</strong> {summary.latestVitals.bloodPressure ?? "—"}</li>
              <li><strong>Heart rate:</strong> {summary.latestVitals.heartRate ?? "—"}</li>
              <li><strong>Weight:</strong> {summary.latestVitals.weightKg ? `${summary.latestVitals.weightKg} kg` : "—"}</li>
              <li><strong>Recorded:</strong> {summary.latestVitals.recordedAt ? new Date(summary.latestVitals.recordedAt).toLocaleString() : "—"}</li>
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No vitals recorded.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 font-semibold">Diagnoses</h2>
        {summary.diagnoses.length ? (
          <ul className="space-y-2 text-sm">
            {summary.diagnoses.map((item: any, index: number) => (
              <li key={`${item.name}-${index}`}>• {item.name} {item.status ? `(${item.status})` : ""}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No diagnoses available.</p>
        )}
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 font-semibold">Medications</h2>
        {summary.medications.length ? (
          <ul className="space-y-2 text-sm">
            {summary.medications.map((item: any, index: number) => (
              <li key={`${item.name}-${index}`}>• {item.name} {item.dosage ? `· ${item.dosage}` : ""} {item.frequency ? `· ${item.frequency}` : ""}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No medication list available.</p>
        )}
      </div>
    </div>
  );
}
