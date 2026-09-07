"use client"
import * as React from "react"
import { Phone, Mail, MapPin, Activity, Calendar, AlertCircle, Droplet, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Patient } from "@/context/MedicalContext"
import { useLocale } from "@/components/locale/locale-provider"

interface PatientProfileSheetProps {
  patient: Patient
}

export function PatientProfileSheet({ patient }: PatientProfileSheetProps) {
  const { t } = useLocale()

  const statusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === "active") return t("patients_active")
    if (s === "inactive" || s === "archived") return t("patients_archived")
    return status
  }

  return (
    <SheetContent className="overflow-y-auto w-full sm:max-w-md md:sm:max-w-lg lg:max-w-xl border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-0">
      <SheetTitle className="sr-only">{t("profile_title").replace("{names}", `${patient.firstName} ${patient.lastName}`)}</SheetTitle>
      <SheetDescription className="sr-only">{t("profile_desc")}</SheetDescription>
      <div className="h-32 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 relative">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
      </div>

      <div className="px-6 pb-6 relative -mt-12">
        <div className="flex justify-between items-end mb-4">
          <div className="w-24 h-24 rounded-[5px] bg-white dark:bg-neutral-900 border-4 border-white dark:border-neutral-950 shadow-xl flex items-center justify-center text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div className="mb-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-[5px] text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
              {statusLabel(patient.status)}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-sm font-medium text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded-[5px] text-neutral-700 dark:text-neutral-300">
              {t("profile_mrn")}: {patient.mrn}
            </span>
            <span>•</span>
            <span>{patient.gender}</span>
            <span>•</span>
            <span>{patient.dob && new Date(patient.dob).toLocaleDateString()}</span>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-[5px] border border-indigo-100 dark:border-indigo-800/30 flex flex-col items-center justify-center text-center">
              <Droplet className="w-5 h-5 text-indigo-500 mb-1" />
              <span className="text-[10px] uppercase font-semibold text-indigo-500/70 tracking-wider">{t("profile_bloodType")}</span>
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{patient.bloodType}</span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-[5px] border border-rose-100 dark:border-rose-800/30 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-5 h-5 text-rose-500 mb-1" />
              <span className="text-[10px] uppercase font-semibold text-rose-500/70 tracking-wider">{t("profile_allergies")}</span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300 truncate w-full" title={patient.allergies}>
                {patient.allergies.length > 15 ? patient.allergies.substring(0, 15) + '...' : patient.allergies}
              </span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-[5px] border border-emerald-100 dark:border-emerald-800/30 flex flex-col items-center justify-center text-center">
              <Activity className="w-5 h-5 text-emerald-500 mb-1" />
              <span className="text-[10px] uppercase font-semibold text-emerald-500/70 tracking-wider">{t("profile_status")}</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{statusLabel(patient.status)}</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-[5px] border border-blue-100 dark:border-blue-800/30 flex flex-col items-center justify-center text-center">
              <Calendar className="w-5 h-5 text-blue-500 mb-1" />
              <span className="text-[10px] uppercase font-semibold text-blue-500/70 tracking-wider">{t("profile_lastVisit")}</span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : t("profile_na")}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">{t("profile_contactDetails")}</h3>
            <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-[5px] p-1 shadow-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[5px] transition-colors">
                  <div className="w-8 h-8 rounded-[5px] bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500 font-medium">{t("profile_phone")}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{patient.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[5px] transition-colors">
                  <div className="w-8 h-8 rounded-[5px] bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500 font-medium">{t("profile_email")}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{patient.email || t("profile_noEmail")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[5px] transition-colors">
                  <div className="w-8 h-8 rounded-[5px] bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500 font-medium">{t("profile_address")}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{patient.address || t("profile_noAddress")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">{t("profile_careTeam")}</h3>
            <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-[5px] p-4 shadow-sm flex items-center gap-4 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-[5px] bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm min-w-0">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{patient.primaryCare}</p>
                <p className="text-neutral-500 text-xs truncate">{t("profile_primaryCare")}</p>
              </div>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t("profile_contact")}</Button>
            </div>
          </div>

        </div>

        <div className="mt-8 flex gap-3 flex-wrap sm:flex-nowrap">
          <Button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none border-0 group relative overflow-hidden">
            <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            <span className="relative flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              {t("profile_completeRecord")}
            </span>
          </Button>
          <Button variant="outline" className="w-full border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-neutral-950">
            <Calendar className="w-4 h-4 mr-2" />
            {t("profile_schedule")}
          </Button>
        </div>
      </div>
    </SheetContent>
  )
}