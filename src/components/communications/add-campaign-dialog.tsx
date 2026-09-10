import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

interface AddCampaignDialogProps {
  onSuccess?: () => void;
}

export function AddCampaignDialog({ onSuccess }: AddCampaignDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "drip",
    triggerType: "",
  });

  async function handleSubmit() {
    if (!formData.name || !formData.type) {
      toast.error(t("camp_fillRequired"));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/communications/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          triggerType: formData.triggerType || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create campaign");

      toast.success(t("camp_createdSuccess"));
      setOpen(false);
      setFormData({ name: "", type: "drip", triggerType: "" });
      onSuccess?.();
    } catch (error) {
      toast.error(t("camp_createError"));
      logClientError("Create campaign failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t("camp_newTrigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("camp_createTitle")}</DialogTitle>
          <DialogDescription>{t("camp_createDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campaign Name */}
          <div>
            <Label htmlFor="name">{t("camp_colName")}</Label>
            <Input
              id="name"
              placeholder={t("camp_namePlaceholder")}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {/* Campaign Type */}
          <div>
            <Label htmlFor="type">{t("camp_type")}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drip">{t("camp_drip")}</SelectItem>
                <SelectItem value="broadcast">{t("camp_broadcast")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">{t("camp_typeHelp")}</p>
          </div>

          {/* Trigger Type (optional) */}
          <div>
            <Label htmlFor="triggerType">{t("camp_triggerType")}</Label>
            <Select
              value={formData.triggerType}
              onValueChange={(value) =>
                setFormData({ ...formData, triggerType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("camp_triggerPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("camp_noTrigger")}</SelectItem>
                <SelectItem value="post_visit">{t("camp_afterVisit")}</SelectItem>
                <SelectItem value="chronic_care">
                  {t("camp_chronicCare")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">{t("camp_triggerHelp")}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common_cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("camp_creating") : t("camp_create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}