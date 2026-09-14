"use client";
import { CalendarPlus, Clock } from "lucide-react";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
      <main className="min-h-screen grid place-items-center p-6 bg-background text-foreground">
        <p className="text-muted-foreground">{t("portal_clinicNotFound")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {clinicName || t("portal_bookTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("portal_bookDesc")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="book-provider">{t("portal_pickProvider")}</Label>
              <SearchableSelect
                value={providerId}
                onValueChange={setProviderId}
                options={providers.map((p) => ({
                  value: p.id,
                  label: `${p.name ?? p.id}${p.specialty ? ` · ${p.specialty}` : ""}`,
                }))}
                placeholder={t("portal_pickProvider")}
                triggerClassName="h-9"
                id="book-provider"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="book-date">{t("portal_pickDate")}</Label>
              <Input
                id="book-date"
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t("portal_pickSlot")}</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("portal_loading")}</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("portal_noSlots")}</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((s) => (
                  <Button
                    key={s.start}
                    type="button"
                    variant={selected === s.start ? "default" : "outline"}
                    className="h-9 text-xs"
                    onClick={() => setSelected(s.start)}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />{formatSlot(s.start, lang)}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            className="w-full h-9"
            disabled={!selected || booking}
            onClick={confirm}
          >
            <CalendarPlus className="h-4 w-4 mr-1" />{t("portal_confirmBooking")}
          </Button>
        </div>
      </div>
    </main>
  );
}
