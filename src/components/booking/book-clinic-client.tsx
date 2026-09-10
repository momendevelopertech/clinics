"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { useLocale } from "@/components/locale/locale-provider";

type ProviderOption = {
  id: string;
  name: string | null;
  specialty: string | null;
  slots: Array<{ start: string; end: string }>;
};

function tomorrowISO(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

function formatSlot(startISO: string, lang: string): string {
  const d = new Date(startISO);
  return d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookClinicClient({ orgSlug }: { orgSlug: string }) {
  const { t, lang } = useLocale();
  const router = useRouter();
  const [providers, setProviders] = React.useState<ProviderOption[]>([]);
  const [providerId, setProviderId] = React.useState("");
  const [date, setDate] = React.useState(tomorrowISO());
  const [clinicName, setClinicName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [booking, setBooking] = React.useState(false);
  const [selected, setSelected] = React.useState("");
  const [missing, setMissing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setMissing(false);
    try {
      const query = new URLSearchParams({ date });
      if (providerId) query.set("providerId", providerId);
      const response = await fetch(`/api/book/${orgSlug}/availability?${query}`);
      const payload = await response.json().catch(() => ({}));
      if (response.status === 404) {
        setMissing(true);
        setProviders([]);
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Failed to load availability");
      setClinicName(payload.org?.name ?? "");
      setProviders(payload.providers ?? []);
    } catch (error) {
      logClientError("Load booking availability failed", error);
      toast.error(t("portal_bookError"));
    } finally {
      setLoading(false);
    }
  }, [orgSlug, date, providerId, t]);

  React.useEffect(() => {
    setSelected("");
    load();
  }, [load]);

  const active = providers.find((p) => p.id === providerId) ?? providers[0];
  const slots = active?.slots ?? [];

  const confirm = async () => {
    if (!active || !selected) return;
    setBooking(true);
    try {
      const response = await fetch(`/api/book/${orgSlug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: active.id, startTime: selected }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        toast.error(t("portal_loginToBook"));
        router.push("/patient-login");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Booking failed");
      toast.success(t("portal_bookSuccess"));
      setSelected("");
      load();
    } catch (error) {
      logClientError("Patient self-booking failed", error);
      toast.error(error instanceof Error ? error.message : t("portal_bookError"));
    } finally {
      setBooking(false);
    }
  };

  if (missing) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <p className="text-neutral-500">{t("portal_clinicNotFound")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {clinicName || t("portal_bookTitle")}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">{t("portal_bookDesc")}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="book-provider">{t("portal_pickProvider")}</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger id="book-provider">
                <SelectValue placeholder={t("portal_pickProvider")} />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name ?? p.id}
                    {p.specialty ? ` · ${p.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="book-date">{t("portal_pickDate")}</Label>
            <Input
              id="book-date"
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium mb-2">{t("portal_pickSlot")}</p>
          {loading ? (
            <p className="text-sm text-neutral-500">{t("portal_loading")}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("portal_noSlots")}</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((s) => (
                <Button
                  key={s.start}
                  type="button"
                  variant={selected === s.start ? "default" : "outline"}
                  onClick={() => setSelected(s.start)}
                >
                  {formatSlot(s.start, lang)}
                </Button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          className="w-full mt-6"
          disabled={!selected || booking}
          onClick={confirm}
        >
          {t("portal_confirmBooking")}
        </Button>
      </div>
    </main>
  );
}
