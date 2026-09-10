"use client";

import * as React from "react";
import { Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

interface UploadDocumentDialogProps {
  onSuccess: () => void;
}

const DOC_TYPE_OPTIONS = [
  "imaging",
  "lab",
  "pathology",
  "consent",
  "medical_record",
  "prescription",
  "other",
] as const;

const DOC_TYPE_KEYS: Record<string, string> = {
  imaging: "docType_imaging",
  lab: "docType_lab",
  pathology: "docType_pathology",
  consent: "docType_consent",
  medical_record: "docType_medicalRecord",
  prescription: "docType_prescription",
  other: "docType_other",
};

function uploadPurposeForDocType(
  type: (typeof DOC_TYPE_OPTIONS)[number],
): "imaging" | "lab_report" | "document" {
  if (type === "imaging") return "imaging";
  if (type === "lab" || type === "pathology") return "lab_report";
  return "document";
}

export function UploadDocumentDialog({ onSuccess }: UploadDocumentDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    patientId: "",
    documentType: "medical_record" as (typeof DOC_TYPE_OPTIONS)[number],
    file: null as File | null,
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
      logClientError("Upload document patient lookup failed", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("doc_sizeError"));
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.documentType) {
      toast.error(t("common_required"));
      return;
    }

    if (!formData.file) {
      toast.error(t("doc_requireFile"));
      return;
    }

    try {
      setLoading(true);

      const uploadBody = new FormData();
      uploadBody.append("file", formData.file);
      uploadBody.append(
        "purpose",
        uploadPurposeForDocType(formData.documentType),
      );

      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: uploadBody,
      });
      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) {
        throw new Error(uploadPayload.error || "Failed to upload file");
      }

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          type: formData.documentType,
          name: formData.file.name,
          storageKey: uploadPayload.url,
          mimeType: uploadPayload.mimeType ?? formData.file.type,
          publicId: uploadPayload.publicId,
        }),
      });

      if (!response.ok) {
        const docPayload = await response.json().catch(() => ({}));
        throw new Error(docPayload.error || "Failed to save document");
      }

      toast.success(t("doc_uploadedSuccess"));
      setFormData({
        patientId: "",
        documentType: "medical_record",
        file: null,
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("doc_uploadError"),
      );
      logClientError("Upload document submission failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t("doc_uploadTrigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("doc_uploadTitle")}</DialogTitle>
          <DialogDescription>{t("doc_uploadDesc")}</DialogDescription>
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
            <Label htmlFor="doc-type">{t("doc_docType")}</Label>
            <Select
              value={formData.documentType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  documentType: value as (typeof DOC_TYPE_OPTIONS)[number],
                })
              }
            >
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(DOC_TYPE_KEYS[type])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="file">{t("doc_fileUpload")}</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
              />
              <label htmlFor="file" className="cursor-pointer">
                <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm font-medium">
                  {formData.file
                    ? formData.file.name
                    : t("doc_dropHint")}
                </p>
                <p className="text-xs text-neutral-500">{t("doc_sizeLimit")}</p>
              </label>
            </div>
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
              {loading ? t("doc_uploading") : t("doc_uploadTrigger")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
