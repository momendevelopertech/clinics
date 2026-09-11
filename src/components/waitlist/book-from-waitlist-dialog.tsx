"use client";

import * as React from "react";
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

export function BookFromWaitlistDialog({
  waitlistId,
  patientName,
  onSuccess,
}: {
  waitlistId: string;
  patientName: string;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [providers, setProviders] = React.useState<Array<{ id: string; name: string }>>([]);
  const [providerId, setProviderId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { t } = useLocale();

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) =>
        setProviders(
          (Array.isArray(d) ? d : []).map((p: { id: string; name: string | null; email: string }) => ({
            id: p.id,
            name: p.name ?? p.email,
          })),
        ),
      )
      .catch((e) => logClientError("Provider list failed", e));
  }, [open ]);

  const handleBook = async () => {
    if (!providerId || !date || !time || saving) return;
    try {
      setSaving(true);
      const start = new Date(`${date}T${time}:00`);
      const response = await fetch(`/api/waitlist/${waitlistId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, startTime: start.toISOString() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Book failed");
      }
      toast.success(t("wl_bookSuccess"));
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("wl_bookError"));
      logClientError("Waitlist book failed", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto text-sm font-medium text-indigo-600">
          {t("wl_book")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("wl_bookTitle")}</DialogTitle>
          <DialogDescription>{patientName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label>{t("wl_provider")}</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label>{t("wl_date")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="gap-2 flex flex-col">
              <Label>{t("wl_time")}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("common_cancel")}
          </Button>
          <Button onClick={handleBook} disabled={!providerId || !date || !time || saving}>
            {t("wl_book")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
