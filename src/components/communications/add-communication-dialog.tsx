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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

interface AddCommunicationDialogProps {
  onSuccess?: () => void;
}

export function AddCommunicationDialog({
  onSuccess,
}: AddCommunicationDialogProps) {
  const { t } = useLocale();
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
    if (
      !formData.patientId ||
      !formData.channel ||
      !formData.type ||
      !formData.content
    ) {
      toast.error(t("comm_fillRequired"));
      return;
    }

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

      toast.success(t("comm_sentSuccess"));
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

        <div className="space-y-4">
          {/* Patient Selection */}
          <div>
            <Label htmlFor="patient">{t("common_patient")}</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common_selectPatient")} />
              </SelectTrigger>
              <SelectContent>
                {patientLoading ? (
                  <SelectItem value="loading" disabled>
                    {t("common_loading")}
                  </SelectItem>
                ) : (
                  patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Channel Selection */}
          <div>
            <Label htmlFor="channel">{t("comm_channel")}</Label>
            <Select
              value={formData.channel}
              onValueChange={(value) =>
                setFormData({ ...formData, channel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">{t("comm_channel_sms")}</SelectItem>
                <SelectItem value="email">{t("comm_channel_email")}</SelectItem>
                <SelectItem value="whatsapp">
                  {t("comm_channel_whatsapp")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Selection */}
          <div>
            <Label htmlFor="type">{t("comm_messageType")}</Label>
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
                <SelectItem value="reminder">
                  {t("comm_type_reminder")}
                </SelectItem>
                <SelectItem value="campaign">
                  {t("comm_type_campaign")}
                </SelectItem>
                <SelectItem value="notification">
                  {t("comm_type_notification")}
                </SelectItem>
                <SelectItem value="survey">{t("comm_type_survey")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Content */}
          <div>
            <Label htmlFor="content">{t("comm_content")}</Label>
            <Textarea
              id="content"
              placeholder={t("comm_contentPlaceholder")}
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
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
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("comm_sendImmediately")}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common_cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("comm_sending") : t("comm_send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}