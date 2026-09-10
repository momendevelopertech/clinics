"use client";

import * as React from "react";
import { Plus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
};

interface AddConsentDialogProps {
  onSuccess: () => void;
}

const CONSENT_TYPE_OPTIONS = [
  "Treatment",
  "Surgery",
  "Medication",
  "Research",
  "Photography",
  "Telehealth",
  "Data Sharing",
  "Insurance",
  "Other",
] as const;

const CONSENT_TYPE_KEYS: Record<string, string> = {
  Treatment: "consentType_treatment",
  Surgery: "consentType_surgery",
  Medication: "consentType_medication",
  Research: "consentType_research",
  Photography: "consentType_photography",
  Telehealth: "consentType_telehealth",
  "Data Sharing": "consentType_dataSharing",
  Insurance: "consentType_insurance",
  Other: "consentType_other",
};

export function AddConsentDialog({ onSuccess }: AddConsentDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    patientId: "",
    consentType: "",
    isGranted: true,
    signedAt: new Date().toISOString().split("T")[0],
    documentUrl: "",
  });

  React.useEffect(() => {
    if (open) {
      fetchPatients();
    }
  }, [open]);

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      toast.error(t("common_loadPatientsError"));
      logClientError("Consent patient lookup failed", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.consentType) {
      toast.error(t("common_required"));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          consentType: formData.consentType,
          isGranted: formData.isGranted,
          signedAt: formData.signedAt,
          documentUrl: formData.documentUrl || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create consent");

      toast.success(t("consent_recordedSuccess"));
      setFormData({
        patientId: "",
        consentType: "",
        isGranted: true,
        signedAt: new Date().toISOString().split("T")[0],
        documentUrl: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(t("consent_recordError"));
      logClientError("Create consent failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t("consent_newTrigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("consent_recordTitle")}</DialogTitle>
          <DialogDescription>{t("consent_recordDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="patient">{t("common_patientRequired")}</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
            >
              <SelectTrigger id="patient">
                <SelectValue placeholder={t("common_selectPatient")} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="consent-type">{t("consent_colType")} *</Label>
            <Select
              value={formData.consentType}
              onValueChange={(value) =>
                setFormData({ ...formData, consentType: value })
              }
            >
              <SelectTrigger id="consent-type">
                <SelectValue placeholder={t("consent_selectType")} />
              </SelectTrigger>
              <SelectContent>
                {CONSENT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(CONSENT_TYPE_KEYS[type])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="signed-date">{t("consent_colSigned")}</Label>
            <Input
              id="signed-date"
              type="date"
              value={formData.signedAt}
              onChange={(e) =>
                setFormData({ ...formData, signedAt: e.target.value })
              }
            />
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="document-url">{t("consent_documentUrl")}</Label>
            <Input
              id="document-url"
              placeholder="https://..."
              value={formData.documentUrl}
              onChange={(e) =>
                setFormData({ ...formData, documentUrl: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is-granted"
              checked={formData.isGranted}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isGranted: checked as boolean })
              }
            />
            <Label htmlFor="is-granted" className="cursor-pointer">
              {t("consent_grantedLabel")}
            </Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("consent_recording") : t("consent_newTrigger")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}