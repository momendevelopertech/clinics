"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { FeatureNotConfiguredBanner } from "@/components/ui/feature-not-configured-banner";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import type { Dictionary } from "@/lib/i18n/locale";

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
    <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {t["reports_schedTitle"]}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t["reports_schedDesc"]}</p>
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
          <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {t["reports_schedMonthly"]} · {t["reports_schedDay"]} {s.dayOfMonth} ·{" "}
              {s.lastSentAt
                ? `${t["reports_schedLastSent"]} ${new Date(s.lastSentAt).toLocaleDateString()}`
                : t["reports_schedNever"]}
            </span>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(s.id)}>
              {t["common_delete"]}
            </Button>
          </div>
        ))}
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t["reports_schedEmpty"]}</p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="gap-2 flex flex-col">
          <Label>{t["reports_schedDay"]}</Label>
          <Input type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="gap-2 flex flex-col">
          <Label>{t["reports_schedRecipient"]}</Label>
          <Select value={recipient} onValueChange={setRecipient}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name ?? s.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={create} disabled={!recipient}>{t["reports_schedCreate"]}</Button>
        </div>
      </div>
    </div>
  );
}
