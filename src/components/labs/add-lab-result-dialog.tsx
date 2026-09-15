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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { ClinicalCatalogSelect } from "@/components/data-source/clinical-catalog-select";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
};

interface AddLabResultDialogProps {
  onSuccess: () => void;
}

export function AddLabResultDialog({ onSuccess }: AddLabResultDialogProps) {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    patientId: "",
    testName: "",
    resultValue: "",
    unit: "",
    referenceRange: "",
    status: "pending",
    performedAt: "",
    reportUrl: "",
  });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const fetchPatients = React.useCallback(async () => {
    try {
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      toast.error(t("common_loadPatientsError"));
      logClientError("Lab result patient lookup failed", error);
    }
  }, [t]);

  React.useEffect(() => {
    if (open) {
      fetchPatients();
    }
  }, [fetchPatients, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.testName) {
      const errors: Record<string, string> = {};
      if (!formData.patientId) errors.patientId = t("labs_requiredFields");
      if (!formData.testName) errors.testName = t("labs_requiredFields");
      setFieldErrors(errors);
      toast.error(t("labs_requiredFields"));
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);
      const response = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          testName: formData.testName,
          resultValue: formData.resultValue || null,
          unit: formData.unit || null,
          referenceRange: formData.referenceRange || null,
          status: formData.status,
          performedAt: formData.performedAt || null,
          reportUrl: formData.reportUrl || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create lab result");

      triggerGuidance("lab_result_added", t("labs_addedSuccess"));
      setFormData({
        patientId: "",
        testName: "",
        resultValue: "",
        unit: "",
        referenceRange: "",
        status: "pending",
        performedAt: "",
        reportUrl: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(t("labs_addError"));
      logClientError("Create lab result failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-2">
          <Plus className="h-4 w-4" /> {t("labs_addResult")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("labs_addTitle")}</DialogTitle>
          <DialogDescription>{t("labs_addDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="patient">{t("labs_patientRequired")}</Label>
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
                options={patients.map((patient) => ({
                  value: patient.id,
                  label: `${patient.firstName} ${patient.lastName}`,
                }))}
                placeholder={t("labs_selectPatient")}
                id="patient"
              />
              {fieldErrors.patientId ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.patientId}</p>
              ) : null}
            </div>

            <div className="gap-1.5 flex flex-col">
              <ClinicalCatalogSelect
                id="test-name"
                system="LAB"
                value={formData.testName}
                onValueChange={(value) => {
                  setFormData({ ...formData, testName: value });
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.testName;
                    return next;
                  });
                }}
                placeholder={t("labs_testNamePh")}
                label={t("labs_testName")}
                fallbackHint={t("ds_noLabCatalog")}
              />
              {fieldErrors.testName ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.testName}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="result-value">{t("labs_resultValue")}</Label>
              <Input
                id="result-value"
                placeholder={t("labs_resultValuePh")}
                value={formData.resultValue}
                onChange={(e) =>
                  setFormData({ ...formData, resultValue: e.target.value })
                }
              />
            </div>

            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="unit">{t("labs_unit")}</Label>
              <Input
                id="unit"
                placeholder={t("labs_unitPh")}
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
              />
            </div>

            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="reference-range">{t("labs_refRange")}</Label>
              <Input
                id="reference-range"
                placeholder={t("labs_refRangePh")}
                value={formData.referenceRange}
                onChange={(e) =>
                  setFormData({ ...formData, referenceRange: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="status">{t("common_status")}</Label>
              <SearchableSelect
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                options={[
                  { value: "pending", label: t("labs_pending") },
                  { value: "completed", label: t("labs_completed") },
                  { value: "abnormal", label: t("labs_abnormal") },
                  { value: "reviewed", label: t("labs_reviewed") },
                ]}
                id="status"
              />
            </div>

            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="performed-at">{t("labs_performedDate")}</Label>
              <Input
                id="performed-at"
                type="date"
                value={formData.performedAt}
                onChange={(e) =>
                  setFormData({ ...formData, performedAt: e.target.value })
                }
              />
            </div>
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="report-url">{t("labs_reportUrl")}</Label>
            <Input
              id="report-url"
              placeholder="https://..."
              value={formData.reportUrl}
              onChange={(e) =>
                setFormData({ ...formData, reportUrl: e.target.value })
              }
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Plus className="h-4 w-4" />
              {loading ? t("labs_adding") : t("labs_addTitle")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
