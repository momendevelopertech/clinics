"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Filter as FilterIcon, Download } from "lucide-react"
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
import { AddPatientDialog } from "@/components/patients/add-patient-dialog"
import { DataPagination } from "@/components/ui/data-pagination"
import { paginate } from "@/lib/pagination"
import { useLocale } from "@/components/locale/locale-provider"

function PatientsPageContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "Active" | "Inactive" | "Archived">("all")
  const [page, setPage] = React.useState(1)
  const { patients, refetchPatients } = useMedical()
  const { t } = useLocale()

  const statusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === "active") return t("patients_active")
    if (s === "inactive" || s === "archived") return t("patients_archived")
    return status
  }

  React.useEffect(() => {
    const query = searchParams.get("q") ?? ""
    setSearchQuery(query)
  }, [searchParams])

  const handleExport = () => {
    toast.success(t("patients_exporting"))
  }

  const filteredPatients = patients.filter(patient => {
    const searchStr = searchQuery.toLowerCase();
    return (statusFilter === "all" || patient.status === statusFilter) && (
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

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">{t("patients_title")}</h2>
          <p className="text-sm text-neutral-500">{t("patients_subtitle")}</p>
        </div>

        <AddPatientDialog onSuccess={refetchPatients} />
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
         <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <Input
                type="search"
                placeholder={t("patients_searchPlaceholder")}
                className="w-full sm:max-w-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
             />
             <div className="flex gap-2">
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="outline" size="sm" className="flex items-center gap-2">
                       <FilterIcon className="w-4 h-4" /> {t("patients_filter")}
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-48">
                     <DropdownMenuLabel>{t("patients_filterByStatus")}</DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <DropdownMenuCheckboxItem checked={statusFilter === "Active"} onCheckedChange={() => setStatusFilter("Active")}>{t("patients_active")}</DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem checked={statusFilter === "Inactive"} onCheckedChange={() => setStatusFilter("Inactive")}>{t("patients_inactive")}</DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem checked={statusFilter === "Archived"} onCheckedChange={() => setStatusFilter("Archived")}>{t("patients_archived")}</DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem checked={statusFilter === "all"} onCheckedChange={() => setStatusFilter("all")}>{t("common_all")}</DropdownMenuCheckboxItem>
                   </DropdownMenuContent>
                 </DropdownMenu>

                 <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2">
                   <Download className="w-4 h-4" /> {t("patients_export")}
                 </Button>
             </div>
         </div>
         <div className="p-0 overflow-x-auto">
             <table className="w-full text-sm text-left">
                 <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                     <tr>
                         <th className="px-6 py-4 border-b">{t("patients_colPatient")}</th>
                         <th className="px-6 py-4 border-b">{t("patients_colMrn")}</th>
                         <th className="px-6 py-4 border-b">{t("patients_colStatus")}</th>
                         <th className="px-6 py-4 border-b">{t("patients_colContact")}</th>
                         <th className="px-6 py-4 border-b hidden md:table-cell">{t("patients_colRegDate")}</th>
                         <th className="px-6 py-4 border-b">{t("common_actions")}</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                     {pagedPatients
                       .map((patient: Patient) => (
                         <tr key={patient.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-[5px] bg-indigo-100 text-indigo-700 font-bold flex justify-center items-center text-xs">
                                     {patient.firstName[0]}{patient.lastName[0]}
                                   </div>
                                   <div>
                                     <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                                     <p className="text-xs text-neutral-500">
                                       {t("patients_dob")}: {new Date(patient.dob).toLocaleDateString()}
                                     </p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 font-mono text-xs text-neutral-500">{patient.mrn}</td>
                             <td className="px-6 py-4">
                                 <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-[5px] text-xs font-medium">
                                     {statusLabel(patient.status)}
                                 </span>
                             </td>
                             <td className="px-6 py-4">
                               <p className="text-xs">{patient.phone}</p>
                               <p className="text-xs text-neutral-500">{patient.email}</p>
                             </td>
                             <td className="px-6 py-4 text-neutral-500 hidden md:table-cell">{new Date(patient.regDate).toLocaleDateString()}</td>
<td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button variant="link" className="text-indigo-600 hover:text-indigo-700 p-0 h-auto">{t("patients_manage")}</Button>
                                    </SheetTrigger>
                                    <PatientProfileSheet patient={patient} onStatusChange={refetchPatients} />
                                  </Sheet>
                                  <Link
                                    href={`/patients/${patient.id}`}
                                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                                  >
                                    {t("patients_timeline")}
                                  </Link>
                                </div>
                              </td>
                         </tr>
                     ))}
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