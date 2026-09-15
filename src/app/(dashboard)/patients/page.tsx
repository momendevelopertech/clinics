"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Download,
  Eye,
  Filter as FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useMedical, Patient } from "@/context/MedicalContext"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { MergePatientsDialog } from "@/components/patients/merge-patients-dialog"
import { AddPatientDialog } from "@/components/patients/add-patient-dialog"
import { DataPagination } from "@/components/ui/data-pagination"
import { EmptyState } from "@/components/ui/loading"
import { paginate } from "@/lib/pagination"
import { useLocale } from "@/components/locale/locale-provider"
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { FeatureTip } from "@/components/feature-tips/feature-tip"

function PatientsPageContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "Active" | "Inactive" | "Archived">("all")
  const [page, setPage] = React.useState(1)
  const { patients, refetchPatients } = useMedical()
  const { t } = useLocale()
  const { triggerGuidance } = usePostActionGuidance();

  const statusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === "active") return t("patients_active")
    if (s === "inactive") return t("patients_inactive")
    if (s === "archived") return t("patients_archived")
    return status
  }

  React.useEffect(() => {
    const query = searchParams.get("q") ?? ""
    setSearchQuery(query)
  }, [searchParams])

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setPage(1)
  }

  const filteredPatients = patients.filter(patient => {
    const searchStr = searchQuery.toLowerCase();
    return (statusFilter === "all" || patient.status.toLowerCase() === statusFilter.toLowerCase()) && (
      patient.firstName.toLowerCase().includes(searchStr) ||
      patient.lastName.toLowerCase().includes(searchStr) ||
      patient.mrn.toLowerCase().includes(searchStr) ||
      patient.phone.includes(searchStr)
    );
  })

  const PAGE_SIZE = 10
  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount)
  const pagedPatients = paginate(filteredPatients, visiblePage, PAGE_SIZE)

  const handleExport = () => {
    const csv = [
      [t("patients_colPatient"), t("patients_colMrn"), t("patients_colStatus"), t("patients_colContact"), t("patients_colRegDate")],
      ...filteredPatients.map((p) => [
        `${p.firstName} ${p.lastName}`,
        p.mrn,
        statusLabel(p.status),
        `${p.phone} ${p.email}`,
        new Date(p.regDate).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    triggerGuidance("export_ready", t("common_success"));
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("patients_title")}</h1>
          <p className="text-xs text-muted-foreground">{t("patients_subtitle")}</p>
        </div>

        <AddPatientDialog onSuccess={refetchPatients} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xs flex-1 flex flex-col">
         <div className="p-4 sm:px-6 border-b border-border bg-muted-bg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <Input
                type="search"
                placeholder={t("patients_searchPlaceholder")}
                className="h-9 w-full sm:max-w-sm rounded-md bg-card text-xs border-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
             />
             <div className="flex gap-2">
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold flex items-center gap-2">
                       <FilterIcon className="w-3.5 h-3.5" /> {t("patients_filter")}
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-48 rounded-md shadow-lg text-xs">
                     <DropdownMenuLabel>{t("patients_filterByStatus")}</DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <DropdownMenuCheckboxItem checked={statusFilter === "Active"} onCheckedChange={() => setStatusFilter("Active")}>{t("patients_active")}</DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem checked={statusFilter === "Inactive"} onCheckedChange={() => setStatusFilter("Inactive")}>{t("patients_inactive")}</DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem checked={statusFilter === "Archived"} onCheckedChange={() => setStatusFilter("Archived")}>{t("patients_archived")}</DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem checked={statusFilter === "all"} onCheckedChange={() => setStatusFilter("all")}>{t("common_all")}</DropdownMenuCheckboxItem>
                   </DropdownMenuContent>
                 </DropdownMenu>

                 <Button variant="outline" size="sm" onClick={handleExport} className="h-9 px-3 text-xs font-semibold flex items-center gap-2">
                   <Download className="w-3.5 h-3.5" /> {t("patients_export")}
                 </Button>
             </div>
         </div>
         <div className="p-0 overflow-x-auto">
             <table className="w-full text-start text-xs">
                 <thead className="border-b border-border bg-muted-bg text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                     <tr>
                         <th className="px-4 py-3">{t("patients_colPatient")}</th>
                         <th className="px-4 py-3">{t("patients_colMrn")}</th>
                         <th className="px-4 py-3">{t("patients_colStatus")}</th>
                         <th className="px-4 py-3">{t("patients_colContact")}</th>
                         <th className="px-4 py-3 hidden md:table-cell">{t("patients_colRegDate")}</th>
                         <th className="px-4 py-3">{t("common_actions")}</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-border text-foreground">
                     {filteredPatients.length === 0 ? (
                       <tr>
                         <td colSpan={6} className="px-0 py-4">
                           <EmptyState title={t("common_noResults")} />
                           <div className="flex justify-center pb-4">
                             <Button variant="outline" size="sm" onClick={resetFilters} className="h-8 px-3 text-xs font-semibold">
                               {t("common_resetFilters")}
                             </Button>
                           </div>
                         </td>
                       </tr>
                     ) : (
                     pagedPatients
                       .map((patient: Patient) => (
                         <tr key={patient.id} className="hover:bg-muted/40 transition-colors">
                             <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-md bg-primary/10 text-primary font-bold flex justify-center items-center text-xs">
                                     {patient.firstName[0]}{patient.lastName[0]}
                                   </div>
                                   <div>
                                     <p className="font-semibold text-foreground">{patient.firstName} {patient.lastName}</p>
                                     <p className="text-[11px] text-muted-foreground">
                                       {t("patients_dob")}: {new Date(patient.dob).toLocaleDateString()}
                                     </p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-4 py-3 font-mono text-muted-foreground">{patient.mrn}</td>
                             <td className="px-4 py-3">
                                 <span className={patient.status.toLowerCase() === "active" ? "px-2 py-0.5 bg-success-bg text-success-text border border-success/30 rounded-full text-[10px] font-semibold" : "px-2 py-0.5 bg-muted-bg text-muted-foreground border border-border rounded-full text-[10px] font-semibold"}>
                                     {statusLabel(patient.status)}
                                 </span>
                             </td>
                             <td className="px-4 py-3">
                               <p className="text-foreground">{patient.phone}</p>
                               <p className="text-[11px] text-muted-foreground">{patient.email}</p>
                             </td>
                             <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(patient.regDate).toLocaleDateString()}</td>
                             <td className="px-4 py-3">
                                 <FeatureTip tipId="patients-manage">
                                 <div className="flex items-center gap-3">
                                   <Sheet>
                                     <SheetTrigger asChild>
                                       <Button variant="link" className="text-primary hover:underline p-0 h-auto text-xs font-semibold"><Eye className="mr-1 h-3.5 w-3.5" />{t("patients_manage")}</Button>
                                     </SheetTrigger>
                                     <PatientProfileSheet patient={patient} onStatusChange={refetchPatients} />
                                   </Sheet>
                                   <Link
                                     href={`/patients/${patient.id}`}
                                     className="text-primary hover:underline text-xs font-semibold"
                                   >
                                     {t("patients_timeline")}
                                   </Link>
                                   <MergePatientsDialog patient={patient} patients={patients} onSuccess={refetchPatients} />
                                 </div>
                                 </FeatureTip>
                               </td>
                         </tr>
                     )))}
                 </tbody>
             </table>
         </div>
         {filteredPatients.length > PAGE_SIZE ? (
           <DataPagination
             page={visiblePage}
             pageSize={PAGE_SIZE}
             total={filteredPatients.length}
             onPageChange={setPage}
           />
         ) : null}
      </div>
    </div>
  )
}

export default function PatientsPage() {
  return (
    <React.Suspense fallback={<div className="flex-1" />}>
      <PatientsPageContent />
    </React.Suspense>
  )
}
