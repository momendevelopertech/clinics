"use client";

import * as React from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { logClientError } from "@/lib/client-logger";
import type { Dictionary } from "@/lib/i18n/locale";

interface Allergy {
  id: string;
  allergen: string;
  severity: string | null;
  reaction: string | null;
  onset: string | null;
  active: boolean;
}

const SEVERITY_KEYS: Array<{ value: string; label: string }> = [
  { value: "mild", label: "allergy_mild" },
  { value: "moderate", label: "allergy_moderate" },
  { value: "severe", label: "allergy_severe" },
];

const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-success-bg text-success-text border border-success/30",
  moderate: "bg-warning-bg text-warning-text border border-warning/30",
  severe: "bg-critical-bg text-critical-text border border-critical/30",
};

export function PatientAllergiesCard({
  patientId,
  t,
}: {
  patientId: string;
  t: Dictionary;
}) {
  const { triggerGuidance } = usePostActionGuidance();
  const [allergies, setAllergies] = React.useState<Allergy[]>([]);
  const [allergen, setAllergen] = React.useState("");
  const [severity, setSeverity] = React.useState("mild");
  const [reaction, setReaction] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const r = await fetch(`/api/patients/${patientId}/allergies`);
      if (r.ok) setAllergies(await r.json());
    } catch (error) {
      logClientError("Allergies load failed", error);
    }
  }, [patientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const addAllergy = async () => {
    if (!allergen.trim()) return;
    try {
      const r = await fetch(`/api/patients/${patientId}/allergies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergen: allergen.trim(),
          severity,
          reaction: reaction.trim() || null,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add allergy");
      }
      triggerGuidance("patient_updated", t["allergy_saved"]);
      setAllergen("");
      setReaction("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      logClientError("Add allergy failed", error);
    }
  };

  const removeAllergy = async (id: string) => {
    if (!window.confirm(t["common_confirmDelete"])) return;
    try {
      const r = await fetch(`/api/patients/${patientId}/allergies/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Failed to remove allergy");
      triggerGuidance("patient_updated", t["allergy_deleted"]);
      await load();
    } catch (error) {
      toast.error(String(error));
      logClientError("Remove allergy failed", error);
    }
  };

  const severe = allergies.some((a) => a.active && a.severity === "severe");

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <header className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {t["allergy_title"]}
        </h2>
        <span className="ml-auto rounded-full bg-muted-bg px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {allergies.length}
        </span>
      </header>

      {allergies.length === 0 ? (
        <p className="mt-3 rounded-md bg-muted-bg px-3 py-2 text-sm text-muted-foreground">
          {t["allergy_empty"]}
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {allergies.map((allergy) => (
            <li
              key={allergy.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted-bg/50 px-3 py-2"
            >
              <div className="min-w-0">
                <span className="text-sm font-semibold text-foreground">{allergy.allergen}</span>
                {allergy.severity ? (
                  <span
                    className={`ml-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[allergy.severity] ?? "bg-muted-bg text-muted-foreground"}`}
                  >
                    {t[SEVERITY_KEYS.find((s) => s.value === allergy.severity)?.label as keyof Dictionary] ?? allergy.severity}
                  </span>
                ) : null}
                {allergy.reaction ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {allergy.reaction}
                  </span>
                ) : null}
              </div>
              <button
                onClick={() => void removeAllergy(allergy.id)}
                className="text-muted-foreground transition hover:text-destructive"
                aria-label={t["allergy_deleted"]}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {severe ? (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-critical/30 bg-critical-bg px-3 py-2 text-xs font-medium text-critical-text">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t["allergy_conflictTitle"]}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          value={allergen}
          onChange={(e) => setAllergen(e.target.value)}
          placeholder={t["allergy_allergen"]}
          className="h-9"
        />
        <SearchableSelect
          value={severity}
          onValueChange={setSeverity}
          options={SEVERITY_KEYS.map((s) => ({
            value: s.value,
            label: t[s.label as keyof Dictionary],
          }))}
          triggerClassName="h-9"
        />
        <Input
          value={reaction}
          onChange={(e) => setReaction(e.target.value)}
          placeholder={t["allergy_reaction"]}
          className="h-9 sm:col-span-2"
        />
      </div>
      <Button size="sm" className="mt-2" onClick={() => void addAllergy()}>
        <Plus className="mr-1 h-4 w-4" />
        {t["allergy_add"]}
      </Button>
    </section>
  );
}