"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { FeatureTip } from "@/components/feature-tips/feature-tip";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type AvailabilityFormProps = {
  t: Dictionary;
  current: {
    availabilityType: string;
    availableDays: string;
    availableFrom: string;
    availableTo: string;
  };
};

export function AvailabilityForm({ t, current }: AvailabilityFormProps) {
  const [availabilityType, setAvailabilityType] = useState(
    current.availabilityType || "regular",
  );
  const [days, setDays] = useState<string[]>(
    (current.availableDays || "")
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean),
  );
  const [from, setFrom] = useState(current.availableFrom || "09:00");
  const [to, setTo] = useState(current.availableTo || "17:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const response = await fetch("/api/profile/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityType,
          availableDays: regularMode ? days : [],
          availableFrom: regularMode ? from : "09:00",
          availableTo: regularMode ? to : "17:00",
        }),
      });
      if (!response.ok) {
        setError(t["common_error"]);
        return;
      }
      setSaved(true);
    } catch {
      setError(t["common_error"]);
    } finally {
      setSubmitting(false);
    }
  }

  const regularMode = availabilityType === "regular";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-content-center rounded-[16px] bg-primary/10 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            {t["availability_title"]}
          </h1>
          <p className="text-sm text-muted-foreground">{t["availability_subtitle"]}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="surface-panel space-y-6 rounded-[24px] border border-white/55 p-6 dark:border-white/6">
        <div>
          <p className="text-sm font-medium text-foreground">{t["availability_type"]}</p>
          <FeatureTip tipId="availability-template">
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { value: "regular", label: t["availability_regular"] },
                { value: "oncall", label: t["availability_oncall"] },
                { value: "by_appointment", label: t["availability_byAppointment"] },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAvailabilityType(option.value)}
                  className={`rounded-[16px] border px-4 py-3 text-sm font-medium transition ${
                    availabilityType === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/60 bg-white/60 text-muted-foreground dark:border-white/6 dark:bg-white/[0.03]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </FeatureTip>
        </div>

        {regularMode ? (
          <>
            <div>
              <p className="text-sm font-medium text-foreground">{t["availability_days"]}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const active = days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-primary text-white shadow-sm"
                          : "border border-white/60 bg-white/60 text-muted-foreground hover:text-foreground dark:border-white/6 dark:bg-white/[0.03]"
                      }`}
                    >
                      {t[`availability_${day}` as keyof Dictionary]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">{t["availability_from"]}</span>
                <input
                  type="time"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-12 w-full rounded-[16px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">{t["availability_to"]}</span>
                <input
                  type="time"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-12 w-full rounded-[16px] border border-border bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
                />
              </label>
            </div>
          </>
        ) : null}

        {error ? (
          <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-linear-to-r from-primary to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "..." : t["common_save"]}
          </button>
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {t["availability_saved"]}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}