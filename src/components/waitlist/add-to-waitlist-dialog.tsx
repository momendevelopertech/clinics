"use client";

import * as React from "react";
import {
  Plus,
  UserPlus,
  X,
} from "lucide-react";;
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { logClientError } from "@/lib/client-logger";
import { parseApiError } from "@/lib/client-errors";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { handleApiError } from "@/lib/api-error-handler";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

interface AddToWaitlistDialogProps {
  onSuccess: () => void;
}

export function AddToWaitlistDialog({ onSuccess }: AddToWaitlistDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    patientId: "",
    preferredDate: "",
    notes: "",
  });

  const fetchPatients = React.useCallback(async () => {
    try {
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      toast.error(t("common_loadPatientsError"));
      logClientError("Waitlist patient lookup failed", error);
    }
  }, [t]);

  React.useEffect(() => {
    if (open) {
      fetchPatients();
    }
  }, [fetchPatients, open]);

  const { triggerGuidance } = usePostActionGuidance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId) {
      toast.error(t("wl_requirePatient"));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          // Date inputs yield "YYYY-MM-DD"; the API expects ISO-8601 datetime.
          preferredDate: formData.preferredDate
            ? new Date(formData.preferredDate).toISOString()
            : null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, t("wl_addError") ?? "Failed to add to waitlist"));
      }

      toast.success(t("wl_addSuccess") ?? "Added to waitlist");
      triggerGuidance("waitlist_added");
      setFormData({ patientId: "", preferredDate: "", notes: "" });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(handleApiError(error, t));
      logClientError("Create waitlist entry failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t("wl_addTrigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("wl_addTitle")}</DialogTitle>
          <DialogDescription>{t("wl_addDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="patient">{t("wl_patientRequired")}</Label>
            <SearchableSelect
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
              options={patients.map((patient) => ({
                value: patient.id,
                label: `${patient.firstName} ${patient.lastName} - ${patient.mrn}`,
              }))}
              placeholder={t("wl_selectPatient")}
              id="patient"
            />
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="preferred-date">{t("wl_colPreferredDate")}</Label>
            <Input
              id="preferred-date"
              type="date"
              value={formData.preferredDate}
              onChange={(e) =>
                setFormData({ ...formData, preferredDate: e.target.value })
              }
            />
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="notes">{t("common_notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("wl_notesPlaceholder")}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="min-h-24"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              <X />{t("common_cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              <UserPlus />{loading ? t("wl_adding") : t("wl_addTrigger")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
