"use client";
import { Save, Video, X } from "lucide-react";

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
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";

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
  const { triggerGuidance } = usePostActionGuidance();

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
      triggerGuidance("telehealth_link_saved", t("tele_saved"));
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
        <Button variant="link" className="text-primary hover:underline p-0 h-auto text-xs font-semibold">
          <Video className="mr-1 h-3.5 w-3.5" />{currentUrl ? t("tele_link") : t("tele_setLink")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">{t("tele_setLink")}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{t("tele_desc")}</DialogDescription>
        </DialogHeader>
        <div className="gap-2 flex flex-col py-2">
          <Label className="text-xs font-semibold">{t("tele_link")}</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("tele_linkPlaceholder")}
            dir="ltr"
            className="h-9 text-xs"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="h-9 text-xs">
            <X className="mr-1 h-3.5 w-3.5" />{t("common_cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-9 text-xs">
            <Save className="mr-1 h-3.5 w-3.5" />{t("common_save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
