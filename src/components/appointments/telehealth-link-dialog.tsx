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
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

export function TelehealthLinkDialog({
  appointmentId,
  currentUrl,
  onSuccess,
}: {
  appointmentId: string;
  currentUrl?: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState(currentUrl ?? "");
  const [saving, setSaving] = React.useState(false);
  const { t } = useLocale();

  const handleSave = async () => {
    const trimmed = url.trim();
    if (trimmed && !trimmed.startsWith("https://")) {
      toast.error(t("tele_error"));
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(`/api/appointments/${appointmentId}/telehealth`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed || null }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "save failed");
      }
      toast.success(t("tele_saved"));
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("tele_error"));
      logClientError("Telehealth link save failed", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-teal-600 hover:text-teal-700 p-0 h-auto">
          {currentUrl ? t("tele_link") : t("tele_setLink")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("tele_setLink")}</DialogTitle>
          <DialogDescription>{t("tele_desc")}</DialogDescription>
        </DialogHeader>
        <div className="gap-2 flex flex-col">
          <Label>{t("tele_link")}</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("tele_linkPlaceholder")}
            dir="ltr"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("common_cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {t("common_save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
