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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Send,
  X,
} from "lucide-react";;
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";

interface AddCommunicationDialogProps {
  onSuccess?: () => void;
}

export function AddCommunicationDialog({
  onSuccess,
}: AddCommunicationDialogProps) {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [patientLoading, setPatientLoading] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    channel: "sms",
    type: "reminder",
    content: "",
    scheduledFor: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function loadPatients() {
    try {
      setPatientLoading(true);
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      toast.error(t("common_loadPatientsError"));
      logClientError("Communication patient lookup failed", error);
    } finally {
      setPatientLoading(false);
    }
  }

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    if (!formData.patientId) errors.patientId = t("comm_fillRequired");
    if (!formData.channel) errors.channel = t("comm_fillRequired");
    if (!formData.type) errors.type = t("comm_fillRequired");
    if (!formData.content) errors.content = t("comm_fillRequired");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(t("comm_fillRequired"));
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);
      const response = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          scheduledFor: formData.scheduledFor || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to create communication");

      triggerGuidance("communication_sent", t("comm_sentSuccess"));
      setOpen(false);
      setFormData({
        patientId: "",
        channel: "sms",
        type: "reminder",
        content: "",
        scheduledFor: "",
      });
      onSuccess?.();
    } catch (error) {
      toast.error(t("comm_sendError"));
      logClientError("Create communication failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" onClick={() => loadPatients()}>
          <Plus className="w-4 h-4" />
          {t("comm_sendMessage")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("comm_sendTitle")}</DialogTitle>
          <DialogDescription>{t("comm_sendDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="space-y-4">
          {/* Patient Selection */}
          <div>
            <Label htmlFor="patient">{t("common_patient")} *</Label>
            <SearchableSelect
              value={formData.patientId}
              onValueChange={(value) => {
                setFormData({ ...formData, patientId: value });
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.patientId;
                  return next;
                });
              }}
              options={
                patientLoading
                  ? [{ value: "loading", label: t("common_loading"), disabled: true }]
                  : patients.map((patient) => ({
                      value: patient.id,
                      label: `${patient.firstName} ${patient.lastName}`,
                    }))
              }
              placeholder={t("common_selectPatient")}
              id="patient"
            />
            {fieldErrors.patientId ? (
              <p className="text-xs text-destructive mt-1">{fieldErrors.patientId}</p>
            ) : null}
          </div>

          {/* Channel Selection */}
          <div>
            <Label htmlFor="channel">{t("comm_channel")} *</Label>
            <SearchableSelect
              value={formData.channel}
              onValueChange={(value) => {
                setFormData({ ...formData, channel: value });
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.channel;
                  return next;
                });
              }}
              options={[
                { value: "sms", label: t("comm_channel_sms") },
                { value: "email", label: t("comm_channel_email") },
                { value: "whatsapp", label: t("comm_channel_whatsapp") },
              ]}
              id="channel"
            />
            {fieldErrors.channel ? (
              <p className="text-xs text-destructive mt-1">{fieldErrors.channel}</p>
            ) : null}
          </div>

          {/* Type Selection */}
          <div>
            <Label htmlFor="type">{t("comm_messageType")} *</Label>
            <SearchableSelect
              value={formData.type}
              onValueChange={(value) => {
                setFormData({ ...formData, type: value });
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.type;
                  return next;
                });
              }}
              options={[
                { value: "reminder", label: t("comm_type_reminder") },
                { value: "campaign", label: t("comm_type_campaign") },
                { value: "notification", label: t("comm_type_notification") },
                { value: "survey", label: t("comm_type_survey") },
              ]}
              id="type"
            />
            {fieldErrors.type ? (
              <p className="text-xs text-destructive mt-1">{fieldErrors.type}</p>
            ) : null}
          </div>

          {/* Message Content */}
          <div>
            <Label htmlFor="content">{t("comm_content")} *</Label>
            <Textarea
              id="content"
              placeholder={t("comm_contentPlaceholder")}
              value={formData.content}
              onChange={(e) => {
                setFormData({ ...formData, content: e.target.value });
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.content;
                  return next;
                });
              }}
              rows={4}
              aria-required="true"
              aria-invalid={fieldErrors.content ? true : undefined}
              className={fieldErrors.content ? "border-destructive" : undefined}
            />
            {fieldErrors.content ? (
              <p className="text-xs text-destructive mt-1">{fieldErrors.content}</p>
            ) : null}
            <p className="text-xs text-muted-foreground mt-1">
              {t("comm_characters").replace(
                "{count}",
                String(formData.content.length),
              )}
            </p>
          </div>

          {/* Schedule Option */}
          <div>
            <Label htmlFor="scheduledFor">{t("comm_scheduleFor")}</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) =>
                setFormData({ ...formData, scheduledFor: e.target.value })
              }
              className="h-9"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("comm_sendImmediately")}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9">
            <X className="h-4 w-4 mr-1" />{t("common_cancel")}
          </Button>
          <Button type="submit" disabled={loading} className="h-9">
            <Send className="h-4 w-4 mr-1" />{loading ? t("comm_sending") : t("comm_send")}
          </Button>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}