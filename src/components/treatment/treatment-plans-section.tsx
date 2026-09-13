"use client";

import * as React from "react";
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

interface PlanStep {
  id: string;
  kind: string;
  title: string;
  status: string;
}

interface Plan {
  id: string;
  title: string;
  status: string;
  steps: PlanStep[];
}

const STEP_KINDS = ["diagnosis", "prescription", "procedure", "followup", "note"];

export function TreatmentPlansSection({
  patientId,
  t,
}: {
  patientId: string;
  t: Dictionary;
}) {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [title, setTitle] = React.useState("");
  const [stepTitle, setStepTitle] = React.useState("");
  const [stepKind, setStepKind] = React.useState("note");
  const [openPlan, setOpenPlan] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const r = await fetch(`/api/treatment-plans?patientId=${patientId}`);
      if (r.ok) setPlans(await r.json());
    } catch (error) {
      logClientError("Treatment plans load failed", error);
    }
  }, [patientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createPlan = async () => {
    if (!title.trim()) return;
    try {
      const r = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, title: title.trim() }),
      });
      if (!r.ok) throw new Error("create failed");
      setTitle("");
      await load();
    } catch (error) {
      toast.error(t["tp_error"]);
      logClientError("Plan create failed", error);
    }
  };

  const setStatus = async (planId: string, status: string) => {
    try {
      const r = await fetch(`/api/treatment-plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "update failed");
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t["tp_error"]);
      logClientError("Plan update failed", error);
    }
  };

  const addStep = async (planId: string) => {
    if (!stepTitle.trim()) return;
    try {
      const r = await fetch(`/api/treatment-plans/${planId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: stepKind, title: stepTitle.trim() }),
      });
      if (!r.ok) throw new Error("step failed");
      setStepTitle("");
      await load();
    } catch (error) {
      toast.error(t["tp_error"]);
      logClientError("Step create failed", error);
    }
  };

  const moveStep = async (planId: string, stepId: string, status: string) => {
    try {
      const r = await fetch(`/api/treatment-plans/${planId}/steps?stepId=${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("step failed");
      await load();
    } catch (error) {
      toast.error(t["tp_error"]);
      logClientError("Step update failed", error);
    }
  };

  const printPlan = async (plan: Plan) => {
    try {
      const r = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "treatment_plan", patientId, planId: plan.id }),
      });
      if (!r.ok) throw new Error("print failed");
      if (r.headers.get("X-Document-Persisted") === "0") {
        const blob = await r.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `treatment-plan.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await r.json();
        window.open(data.url, "_blank");
      }
      toast.success(t["tp_printed"]);
    } catch (error) {
      toast.error(t["tp_error"]);
      logClientError("Plan print failed", error);
    }
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
        <p className="text-sm font-semibold text-foreground">{t["tp_title"]}</p>
        <div className="mt-2 flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={String(t["tp_newPlaceholder"])}
            className="h-9"
          />
          <Button size="sm" onClick={createPlan} disabled={!title.trim()} className="h-9">
            {t["tp_create"]}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <p className="text-sm font-semibold text-foreground">{t["tp_title"]}</p>
      <div className="mt-2 flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={String(t["tp_newPlaceholder"])}
          className="h-9"
        />
        <Button size="sm" onClick={createPlan} disabled={!title.trim()} className="h-9">
          {t["tp_create"]}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {plan.title} · <span className="text-xs font-normal text-muted-foreground uppercase">{plan.status}</span>
              </p>
              <div className="flex gap-2">
                {plan.status === "draft" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(plan.id, "active")}>
                    {t["tp_activate"]}
                  </Button>
                ) : null}
                {plan.status === "active" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(plan.id, "completed")}>
                    {t["tp_complete"]}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => printPlan(plan)}>
                  {t["tp_print"]}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpenPlan(openPlan === plan.id ? "" : plan.id)}>
                  {openPlan === plan.id ? "−" : "+"}
                </Button>
              </div>
            </div>
            {openPlan === plan.id ? (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {plan.steps.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm text-foreground bg-card p-2 rounded-md border border-border">
                    <span>
                      <strong className="font-semibold text-xs uppercase text-primary">[{s.status}]</strong> {s.title} <span className="text-xs text-muted-foreground">({s.kind})</span>
                    </span>
                    {s.status === "pending" ? (
                      <span className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => moveStep(plan.id, s.id, "done")}>
                          {t["tp_done"]}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => moveStep(plan.id, s.id, "skipped")}>
                          {t["tp_skip"]}
                        </Button>
                      </span>
                    ) : null}
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Select value={stepKind} onValueChange={setStepKind}>
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STEP_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={stepTitle}
                    onChange={(e) => setStepTitle(e.target.value)}
                    placeholder={String(t["tp_stepPlaceholder"])}
                    className="h-9"
                  />
                  <Button size="sm" onClick={() => addStep(plan.id)} disabled={!stepTitle.trim()} className="h-9">
                    {t["tp_addStep"]}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
