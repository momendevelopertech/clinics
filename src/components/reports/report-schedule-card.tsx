"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { FeatureNotConfiguredBanner } from "@/components/ui/feature-not-configured-banner";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import type { Dictionary } from "@/lib/i18n/locale";
import { CalendarClock, Trash2, Plus } from "lucide-react";

interface Schedule {
  id: string;
  dayOfMonth: number;
  active: boolean;
  lastSentAt: string | null;
}

export function ReportScheduleCard({ t }: { t: Dictionary }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [day, setDay] = useState("1");
  const [recipient, setRecipient] = useState("");
  const { get } = useFeatureConfig();
  const email = get("email");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/reports/schedules");
      if (r.ok) setSchedules(await r.json());
    } catch (error) {
      logClientError("Schedules load failed", error);
    }
  }, []);

  useEffect(() => {
    void load();
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStaff(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [load]);

  const create = async () => {
    if (!recipient) return;
    try {
      const r = await fetch("/api/reports/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfMonth: Number(day), recipients: [recipient] }),
      });
      if (r.status === 403) {
        toast.error(t["reports_schedOwnerOnly"]);
        return;
      }
      if (!r.ok) throw new Error("create failed");
      toast.success(t["reports_schedCreated"]);
      await load();
    } catch (error) {
      toast.error(t["reports_schedError"]);
      logClientError("Schedule create failed", error);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t["common_confirmDelete"])) return;
    try {
      const r = await fetch(`/api/reports/schedules/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("delete failed");
      await load();
    } catch (error) {
      toast.error(t["reports_schedError"]);
      logClientError("Schedule delete failed", error);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-2xs">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold tracking-tight text-foreground">
          {t["reports_schedTitle"]}
        </h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t["reports_schedDesc"]}</p>
      {email && !email.configured ? (
        <div className="mt-4">
          <FeatureNotConfiguredBanner
            feature="email"
            missingEnvVars={email.missing}
            devFallback={email.devFallback}
          />
        </div>
      ) : null}
      <div className="mt-4 space-y-2">
        {schedules.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 text-xs rounded-md bg-muted-bg/50 px-3 py-2 border border-border/50">
            <span className="text-foreground font-medium">
              {t["reports_schedMonthly"]} · {t["reports_schedDay"]} {s.dayOfMonth} ·{" "}
              <span className="text-muted-foreground">
                {s.lastSentAt
                  ? `${t["reports_schedLastSent"]} ${new Date(s.lastSentAt).toLocaleDateString()}`
                  : t["reports_schedNever"]}
              </span>
            </span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => remove(s.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />{t["common_delete"]}
            </Button>
          </div>
        ))}
        {schedules.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{t["reports_schedEmpty"]}</p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-border pt-4">
        <div className="gap-1.5 flex flex-col">
          <Label className="text-xs font-semibold">{t["reports_schedDay"]}</Label>
          <Input type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="gap-1.5 flex flex-col">
          <Label className="text-xs font-semibold">{t["reports_schedRecipient"]}</Label>
          <SearchableSelect value={recipient} onValueChange={setRecipient} options={staff.map((s) => ({ value: s.id, label: s.name ?? s.email }))} triggerClassName="h-9 text-xs" contentClassName="text-xs" />
        </div>
        <div className="flex items-end">
          <Button onClick={create} disabled={!recipient} className="h-9 w-full text-xs font-semibold shadow-2xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />{t["reports_schedCreate"]}
          </Button>
        </div>
      </div>
    </div>
  );
}
