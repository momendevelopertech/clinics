"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";

function toNumOrNull(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * G4: Nurse/Reception vitals entry bound to the current visit.
 * POSTs to /api/vitals with { patientId, encounterId } so the doctor
 * sees it instantly in EncounterVitalsCard (REST + SSE).
 */
export function RecordVitalsDialog({
  patientId,
  encounterId,
  patientLabel,
  triggerLabel,
  onSaved,
}: {
  patientId: string;
  encounterId?: string;
  patientLabel?: string;
  triggerLabel?: string;
  onSaved?: () => void;
}) {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [weightKg, setWeightKg] = React.useState("");
  const [heightCm, setHeightCm] = React.useState("");
  const [sys, setSys] = React.useState("");
  const [dia, setDia] = React.useState("");
  const [hr, setHr] = React.useState("");
  const [spo2, setSpo2] = React.useState("");
  const [temp, setTemp] = React.useState("");

  const reset = () => {
    setWeightKg("");
    setHeightCm("");
    setSys("");
    setDia("");
    setHr("");
    setSpo2("");
    setTemp("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      patientId,
      encounterId: encounterId ?? null,
      weightKg: toNumOrNull(weightKg),
      heightCm: toNumOrNull(heightCm),
      bloodPressureSystolic: sys.trim() ? Number(sys) : null,
      bloodPressureDiastolic: dia.trim() ? Number(dia) : null,
      heartRate: hr.trim() ? Number(hr) : null,
      spO2: spo2.trim() ? Number(spo2) : null,
      temperature: temp.trim() ? Number(temp) : null,
    };
    if (
      payload.weightKg == null &&
      payload.heightCm == null &&
      payload.bloodPressureSystolic == null &&
      payload.bloodPressureDiastolic == null &&
      payload.heartRate == null &&
      payload.spO2 == null &&
      payload.temperature == null
    ) {
      toast.error(t("enc_vitalsRequireOne"));
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || t("enc_vitalsSaveError"));
      }
      triggerGuidance("vitals_recorded", t("common_saved"));
      reset();
      setOpen(false);
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("enc_vitalsSaveError");
      toast.error(msg);
      logClientError("Record vitals failed", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs">
          <Plus className="me-1 h-3.5 w-3.5" />
          {triggerLabel ?? t("enc_vitalsRecord")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("enc_vitalsRecordTitle")}</DialogTitle>
          <DialogDescription>
            {patientLabel ?? t("enc_vitalsRecordDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">{t("enc_vitalsBpSys")}</Label>
            <Input value={sys} onChange={(e) => setSys(e.target.value)} inputMode="numeric" placeholder="120" className="ltr-on-rtl h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">{t("enc_vitalsBpDia")}</Label>
            <Input value={dia} onChange={(e) => setDia(e.target.value)} inputMode="numeric" placeholder="80" className="ltr-on-rtl h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">{t("enc_vitalsHr")}</Label>
            <Input value={hr} onChange={(e) => setHr(e.target.value)} inputMode="numeric" placeholder="72" className="ltr-on-rtl h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">{t("enc_vitalsTemp")}</Label>
            <Input value={temp} onChange={(e) => setTemp(e.target.value)} inputMode="decimal" placeholder="37" className="ltr-on-rtl h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">{t("enc_vitalsSpo2")}</Label>
            <Input value={spo2} onChange={(e) => setSpo2(e.target.value)} inputMode="numeric" placeholder="98" className="ltr-on-rtl h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">{t("enc_vitalsWeight")}</Label>
            <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} inputMode="decimal" placeholder="70" className="ltr-on-rtl h-9" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs font-semibold">{t("enc_vitalsHeight")}</Label>
            <Input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} inputMode="decimal" placeholder="170" className="ltr-on-rtl h-9" />
          </div>
          <div className="col-span-2 flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("common_saving") : t("common_save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
