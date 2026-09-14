"use client"
import * as React from "react"
import Link from "next/link"
import { Phone, Mail, MapPin, Activity, Calendar, AlertCircle, Droplet, User, FileText, ArchiveRestore } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Patient } from "@/context/MedicalContext"
import { useLocale } from "@/components/locale/locale-provider"
import { toast } from "sonner"

interface PatientProfileSheetProps {
  patient: Patient
  onStatusChange?: () => void
}

export function PatientProfileSheet({ patient, onStatusChange }: PatientProfileSheetProps) {
  const { t } = useLocale()
  const [updatingStatus, setUpdatingStatus] = React.useState(false)

  const toggleArchive = async () => {
    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/patients/${patient.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: patient.status !== "Archived" }),
      })
      if (!response.ok) throw new Error(t("common_error"))
      onStatusChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common_error"))
    } finally {
      setUpdatingStatus(false)
    }
  }

  const statusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === "active") return t("patients_active")
    if (s === "inactive" || s === "archived") return t("patients_archived")
    return status
  }

  return (
    <SheetContent className="overflow-y-auto w-full sm:max-w-md md:sm:max-w-lg lg:max-w-xl border-l border-border bg-card p-0">
      <SheetTitle className="sr-only">{t("profile_title").replace("{names}", `${patient.firstName} ${patient.lastName}`)}</SheetTitle>
      <SheetDescription className="sr-only">{t("profile_desc")}</SheetDescription>
      <div className="h-28 w-full bg-primary relative" />

      <div className="px-6 pb-6 relative -mt-10">
        <div className="flex justify-between items-end mb-4">
          <div className="w-20 h-20 rounded-lg bg-card border-4 border-background shadow-md flex items-center justify-center text-2xl font-bold text-primary">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div className="mb-2">
            <span className={patient.status === "Active" ? "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-success-bg text-success-text border border-success/30 shadow-xs" : "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-muted-bg text-muted-foreground border border-border shadow-xs"}>
              {statusLabel(patient.status)}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs bg-muted-bg px-2 py-0.5 rounded-md text-foreground">
              {t("profile_mrn")}: {patient.mrn}
            </span>
            <span>•</span>
            <span>{patient.gender}</span>
            <span>•</span>
            <span>{patient.dob && new Date(patient.dob).toLocaleDateString()}</span>
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted-bg p-3 rounded-lg border border-border flex flex-col items-center justify-center text-center">
              <Droplet className="w-5 h-5 text-primary mb-1" />
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{t("profile_bloodType")}</span>
              <span className="text-sm font-bold text-foreground">{patient.bloodType}</span>
            </div>
            <div className="bg-critical-bg p-3 rounded-lg border border-critical/30 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-5 h-5 text-destructive mb-1" />
              <span className="text-[10px] uppercase font-semibold text-critical-text tracking-wider">{t("profile_allergies")}</span>
              <span className="text-sm font-bold text-critical-text truncate w-full" title={patient.allergies}>
                {patient.allergies.length > 15 ? patient.allergies.substring(0, 15) + '...' : patient.allergies}
              </span>
            </div>
            <div className="bg-success-bg p-3 rounded-lg border border-success/30 flex flex-col items-center justify-center text-center">
              <Activity className="w-5 h-5 text-success-text mb-1" />
              <span className="text-[10px] uppercase font-semibold text-success-text tracking-wider">{t("profile_status")}</span>
              <span className="text-sm font-bold text-success-text">{statusLabel(patient.status)}</span>
            </div>
            <div className="bg-muted-bg p-3 rounded-lg border border-border flex flex-col items-center justify-center text-center">
              <Calendar className="w-5 h-5 text-primary mb-1" />
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{t("profile_lastVisit")}</span>
              <span className="text-sm font-bold text-foreground">{patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : t("profile_na")}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("profile_familyHistory")}</h3>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {patient.familyHistory || t("profile_noHistory")}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("profile_contactDetails")}</h3>
            <div className="bg-card border border-border rounded-lg p-1 shadow-xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-md transition-colors">
                  <div className="w-8 h-8 rounded-md bg-muted-bg flex items-center justify-center text-muted-foreground shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{t("profile_phone")}</p>
                    <p className="text-sm font-medium text-foreground truncate">{patient.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-md transition-colors">
                  <div className="w-8 h-8 rounded-md bg-muted-bg flex items-center justify-center text-muted-foreground shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{t("profile_email")}</p>
                    <p className="text-sm font-medium text-foreground truncate">{patient.email || t("profile_noEmail")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-md transition-colors">
                  <div className="w-8 h-8 rounded-md bg-muted-bg flex items-center justify-center text-muted-foreground shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{t("profile_address")}</p>
                    <p className="text-sm font-medium text-foreground truncate">{patient.address || t("profile_noAddress")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("profile_careTeam")}</h3>
            <div className="bg-card border border-border rounded-lg p-4 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm min-w-0">
                <p className="font-semibold text-foreground truncate">{patient.primaryCare}</p>
                <p className="text-muted-foreground text-xs truncate">{t("profile_primaryCare")}</p>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 flex gap-3 flex-wrap sm:flex-nowrap">
          <Link href={`/patients/${patient.id}`} className="w-full">
            <Button className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              {t("profile_completeRecord")}
            </Button>
          </Link>
          <Link href="/appointments" className="w-full">
            <Button variant="outline" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              {t("profile_schedule")}
            </Button>
          </Link>
          <Button variant="outline" onClick={toggleArchive} disabled={updatingStatus} className="w-full">
            <ArchiveRestore className="mr-2 h-4 w-4" />
            {patient.status === "Archived" ? t("profile_restore") : t("profile_archive")}
          </Button>
        </div>
      </div>
    </SheetContent>
  )
}