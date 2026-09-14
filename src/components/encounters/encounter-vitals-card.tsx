"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { useVitalsStream } from "@/hooks/use-vitals-stream";
import { useLocale } from "@/components/locale/locale-provider";
import { logClientError } from "@/lib/client-logger";
import { RecordVitalsDialog } from "@/components/encounters/record-vitals-dialog";

type VitalRow = {
  id: string;
  patientId: string;
  encounterId: string | null;
  weightKg: number | null;
  heightCm: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  bmi: number | null;
  spO2: number | null;
  temperature: number | null;
  recordedAt: string;
};

function formatBp(v: VitalRow | null): string {
  if (!v || (v.bloodPressureSystolic == null && v.bloodPressureDiastolic == null)) return "—";
  return `${v.bloodPressureSystolic ?? "—"}/${v.bloodPressureDiastolic ?? "—"}`;
}

function formatNum(v: number | null | undefined): string {
  return v == null ? "—" : String(v);
}

/**
 * G4: Vitals snapshot inside the clinical workspace.
 * Shows the latest vital for this patient/encounter + live updates via SSE,
 * with an empty state that guides to RecordVitalsDialog (no dead-ends).
 */
export function EncounterVitalsCard({
  patientId,
  encounterId,
  patientLabel,
  onSaved,
}: {
  patientId: string;
  encounterId?: string;
  patientLabel?: string;
  onSaved?: () => void;
}) {
  const { t } = useLocale();
  const [snapshot, setSnapshot] = React.useState<VitalRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { latestVital, status } = useVitalsStream(patientId);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ patientId });
      if (encounterId) params.set("encounterId", encounterId);
      const res = await fetch(`/api/vitals?${params.toString()}`);
      if (!res.ok) return;
      const rows = (await res.json()) as VitalRow[];
      if (Array.isArray(rows) && rows.length > 0) setSnapshot(rows[0]);
    } catch (e) {
      logClientError("Encounter vitals load failed", e);
    } finally {
      setLoading(false);
    }
  }, [patientId, encounterId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Live stream overrides the REST snapshot when it arrives.
  const live = latestVital as unknown as VitalRow | null;
  const shown: VitalRow | null = live ?? snapshot;

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          {t("enc_vitalsTitle")}
          {status === "live" ? (
            <span className="rounded-full bg-success-bg px-1.5 py-0.5 text-[10px] font-semibold text-success-text">
              {t("enc_vitalsLive")}
            </span>
          ) : null}
        </p>
        <RecordVitalsDialog
          patientId={patientId}
          encounterId={encounterId}
          patientLabel={patientLabel}
          onSaved={() => {
            void load();
            onSaved?.();
          }}
        />
      </div>
      {loading ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("common_loading")}</p>
      ) : shown ? (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <span className="text-muted-foreground">
            {t("enc_vitalsBp")}:{" "}
            <strong className="font-semibold text-foreground ltr-on-rtl">{formatBp(shown)}</strong>
          </span>
          <span className="text-muted-foreground">
            {t("enc_vitalsHr")}:{" "}
            <strong className="font-semibold text-foreground">{formatNum(shown.heartRate)}</strong>
          </span>
          <span className="text-muted-foreground">
            {t("enc_vitalsTemp")}:{" "}
            <strong className="font-semibold text-foreground">{formatNum(shown.temperature)}</strong>
          </span>
          <span className="text-muted-foreground">
            {t("enc_vitalsSpo2")}:{" "}
            <strong className="font-semibold text-foreground">{formatNum(shown.spO2)}</strong>
          </span>
          <span className="text-muted-foreground">
            {t("enc_vitalsWeight")}:{" "}
            <strong className="font-semibold text-foreground">{formatNum(shown.weightKg)}</strong>
          </span>
          <span className="text-muted-foreground">
            {t("enc_vitalsBmi")}:{" "}
            <strong className="font-semibold text-foreground">{formatNum(shown.bmi)}</strong>
          </span>
          <span className="col-span-2 text-[11px] text-muted-foreground">
            {new Date(shown.recordedAt).toLocaleString()}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{t("enc_vitalsEmpty")}</p>
      )}
    </div>
  );
}
