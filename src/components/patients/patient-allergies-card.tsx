"use client";

import * as React from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
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
  mild: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  severe: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function PatientAllergiesCard({
  patientId,
  t,
}: {
  patientId: string;
  t: Dictionary;
}) {
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
      toast.success(t["allergy_saved"]);
      setAllergen("");
      setReaction("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      logClientError("Add allergy failed", error);
    }
  };

  const removeAllergy = async (id: string) => {
    try {
      const r = await fetch(`/api/patients/${patientId}/allergies/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Failed to remove allergy");
      toast.success(t["allergy_deleted"]);
      await load();
    } catch (error) {
      toast.error(String(error));
      logClientError("Remove allergy failed", error);
    }
  };

  const severe = allergies.some((a) => a.active && a.severity === "severe");

  return (
    <section className="rounded-[24px] border border-white/55 bg-white/60 p-5 dark:border-white/6 dark:bg-white/[0.03]">
      <header className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          {t["allergy_title"]}
        </h2>
        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {allergies.length}
        </span>
      </header>

      {allergies.length === 0 ? (
        <p className="mt-3 rounded-[14px] bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {t["allergy_empty"]}
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {allergies.map((allergy) => (
            <li
              key={allergy.id}
              className="flex items-center justify-between gap-2 rounded-[14px] bg-muted/40 px-3 py-2"
            >
              <div className="min-w-0">
                <span className="text-sm font-semibold">{allergy.allergen}</span>
                {allergy.severity ? (
                  <span
                    className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[allergy.severity] ?? "bg-muted text-muted-foreground"}`}
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
                className="text-muted-foreground transition hover:text-red-500"
                aria-label={t["allergy_deleted"]}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {severe ? (
        <p className="mt-3 flex items-center gap-2 rounded-[14px] bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
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
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_KEYS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {t[s.label as keyof Dictionary]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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