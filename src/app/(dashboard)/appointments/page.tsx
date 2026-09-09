"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Calendar as CalendarIcon, Clock, Filter, List, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

import { useMedical, Appointment } from "@/context/MedicalContext"
import { BookAppointmentDialog } from "@/components/features/appointments/book-appointment-dialog"
import {
  FullScreenCalendar,
  type CalendarEvent,
} from "@/components/ui/fullscreen-calendar"
import { DataPagination } from "@/components/ui/data-pagination"
import { paginate } from "@/lib/pagination"
import { useLocale } from "@/components/locale/locale-provider"
import { cn } from "@/lib/utils"

function toStatusValue(s: Appointment["status"]): string {
  if (s === "Confirmed") return "confirmed"
  if (s === "In Waiting Room") return "waiting"
  if (s === "Scheduled") return "scheduled"
  return "pending"
}
function toTimeValue(t: string): string {
  if (t.includes("AM") || t.includes("PM")) {
    const m = t.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i)
    if (m) {
      let h = parseInt(m[1], 10)
      const min = m[2] ? parseInt(m[2], 10) : 0
      if (m[3]?.toUpperCase() === "PM" && h < 12) h += 12
      if (m[3]?.toUpperCase() === "AM" && h === 12) h = 0
      return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
    }
  }
  return t.replace(/\s*(AM|PM)/gi, "") || "09:00"
}

const DEFAULT_PROVIDERS = ["Dr. Jane Smith", "Dr. Robert Chen"] as const

function EditAppointmentDialog({
  apt,
  patientName,
  onSave,
  onCancel,
}: {
  apt: Appointment
  patientName: string
  onSave: (data: { provider: string; date: string; time: string; status: string }) => void
  onCancel: () => void
}) {
  const providerOptions = React.useMemo(() => {
    const current = apt.provider?.trim()
    if (!current || DEFAULT_PROVIDERS.includes(current as (typeof DEFAULT_PROVIDERS)[number])) {
      return [...DEFAULT_PROVIDERS]
    }
    return [current, ...DEFAULT_PROVIDERS]
  }, [apt.provider])

  const { t } = useLocale()

  const [provider, setProvider] = React.useState(apt.provider?.trim() || DEFAULT_PROVIDERS[0])
  const [date, setDate] = React.useState(apt.date)
  const [time, setTime] = React.useState(toTimeValue(apt.time))
  const [status, setStatus] = React.useState(toStatusValue(apt.status))

  React.useEffect(() => {
    setProvider(apt.provider?.trim() || DEFAULT_PROVIDERS[0])
    setDate(apt.date)
    setTime(toTimeValue(apt.time))
    setStatus(toStatusValue(apt.status))
  }, [apt.id, apt.provider, apt.date, apt.time, apt.status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ provider, date, time, status })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("appts_editTitle")}</DialogTitle>
            <DialogDescription>
              {t("appts_editDesc").replace("{name}", patientName)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-provider">{t("appts_provider")}</Label>
              <Select value={provider || providerOptions[0]} onValueChange={setProvider}>
                <SelectTrigger id="edit-provider" className="w-full">
                  <SelectValue placeholder={t("appts_selectProvider")} />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-date">{t("appts_date")}</Label>
                <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-time">{t("appts_time")}</Label>
                <Input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">{t("appts_status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder={t("appts_apptStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{t("appts_statusScheduled")}</SelectItem>
                  <SelectItem value="confirmed">{t("appts_statusConfirmed")}</SelectItem>
                  <SelectItem value="waiting">{t("appts_statusWaitingRoom")}</SelectItem>
                  <SelectItem value="pending">{t("appts_statusPending")}</SelectItem>
                  <SelectItem value="in_progress">{t("appts_statusInProgress")}</SelectItem>
                  <SelectItem value="completed">{t("appts_statusCompleted")}</SelectItem>
                  <SelectItem value="cancelled">{t("appts_cancel")}</SelectItem>
                  <SelectItem value="no_show">{t("appts_statusNoShow")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>{t("common_cancel")}</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">{t("appts_saveChanges")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AppointmentsPageContent() {
  const searchParams = useSearchParams()
  const { appointments, patients, addAppointment, updateAppointment } = useMedical()
  const [providers, setProviders] = React.useState<{ id: string; name: string }[]>([])
  const { t } = useLocale()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [view, setView] = React.useState<"list" | "calendar">("list")
  const [editAptId, setEditAptId] = React.useState<string | null>(null)
  const [providerFilter, setProviderFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      "Scheduled": t("appts_statusScheduled"),
        scheduled: t("appts_statusScheduled"),
        "Confirmed": t("appts_statusConfirmed"),
        confirmed: t("appts_statusConfirmed"),
        "Pending": t("appts_statusPending"),
        pending: t("appts_statusPending"),
        "Walk-in": t("appts_walkIn"),
        "Cancelled": t("appts_cancel"),
        cancelled: t("appts_cancel"),
        "In Waiting Room": t("appts_statusWaitingRoom"),
        arrived: t("appts_statusWaitingRoom"),
        in_progress: t("appts_statusInProgress"),
        completed: t("appts_statusCompleted"),
        no_show: t("appts_statusNoShow"),
    }
    return map[s] ?? s
  }

  const apptTypeLabel = (s: string) => {
    const map: Record<string, string> = {
      consultation: t("apptType_consultation"),
      "Follow-up": t("apptType_followup"),
      "New Patient": t("apptType_newPatient"),
      Procedure: t("apptType_procedure"),
      Telehealth: t("apptType_telehealth"),
    }
    return map[s] ?? s
  }

  React.useEffect(() => {
    const query = searchParams.get("q") ?? ""
    setSearchQuery(query)
    if (query) {
      setView("list")
    }
  }, [searchParams])

  React.useEffect(() => {
    void fetch("/api/staff")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load providers")
        const data = (await response.json()) as { id: string; name: string | null; email: string }[]
        setProviders(data.map((provider) => ({ id: provider.id, name: provider.name ?? provider.email })))
      })
      .catch(() => {
        setProviders([])
        toast.error(t("appts_providerLoadError"))
      })
  }, [t])

  const statusMap: Record<string, Appointment["status"]> = {
    scheduled: "scheduled",
    confirmed: "confirmed",
    waiting: "arrived",
    pending: "scheduled",
    in_progress: "in_progress",
    completed: "completed",
    cancelled: "cancelled",
    no_show: "no_show",
  }
  const handleEdit = (id: string, data: { provider: string; date: string; time: string; status: string }) => {
    updateAppointment(id, {
      provider: data.provider,
      date: data.date,
      time: data.time,
      status: statusMap[data.status] || "Pending",
    })
    toast.success(t("appts_updated"))
  }

  // Map appointments to CalendarEvent for 3D calendar (exclude cancelled)
  const calendarEvents: CalendarEvent[] = React.useMemo(() => {
    return appointments
      .filter((apt) => apt.status !== "Cancelled" && apt.status !== "cancelled")
      .map((apt) => {
        const patient = patients.find((p) => p.id === apt.patientId)
        const patientName = patient
          ? `${patient.firstName} ${patient.lastName}`
          : t("appts_unknownPatient")
        const apiApt = apt as { startTime?: string }
        const dateIso = apiApt.startTime
          ? apiApt.startTime
          : `${apt.date}T09:00:00`
        return {
          id: apt.id,
          title: `${patientName} – ${apt.type}`,
          date: dateIso,
        }
      })
  }, [appointments, patients, t])

  const filteredAppointments = appointments.filter((appointment) => {
    const normalized = searchQuery.trim().toLowerCase()
    if (providerFilter !== "all" && appointment.provider !== providerFilter) {
      return false
    }
    if (!normalized) {
      return true
    }

    const patient = patients.find((entry) => entry.id === appointment.patientId)
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : ""

    return [
      patientName,
      appointment.provider,
      appointment.type,
      appointment.date,
      appointment.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  })

  const PAGE_SIZE = 10
  const pageCount = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount)
  const pagedAppointments = paginate(filteredAppointments, visiblePage, PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">{t("appts_title")}</h2>
          <p className="text-sm text-neutral-500">{t("appts_subtitle")}</p>
        </div>
        
        <BookAppointmentDialog
          patients={patients}
          providers={providers}
          onBook={(data) =>
            addAppointment({
              patientId: data.patientId,
              provider: providers.find((provider) => provider.id === data.providerId)?.name ?? "",
              providerId: data.providerId,
              date: data.date,
              time: data.time,
              type: data.type,
              duration: data.duration,
              status: "Scheduled",
            })
          }
        />
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
         <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div className="flex items-center gap-2 text-lg font-medium">
                 <CalendarIcon className="w-5 h-5 text-neutral-500" />
                 {view === "list"
                   ? t("appts_todayList")
                   : t("appts_monthView")}
               </div>
<Input
                  type="search"
                  placeholder={t("appts_searchPlaceholder")}
                  className="w-full sm:max-w-sm"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="flex gap-2">
                  <Select
                    value={providerFilter}
                    onValueChange={(value) => {
                      setProviderFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[190px] h-10" aria-label={t("appts_allProviders")}>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("appts_allProviders")}</SelectItem>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.name}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                 <div className="bg-neutral-100 dark:bg-neutral-800 rounded-[5px] p-1 flex" role="tablist" aria-label={t("appts_viewMode")}>
                     <button
                       role="tab"
                       aria-selected={view === "list"}
                       onClick={() => setView("list")}
                       className={cn(
                         "px-3 py-1.5 rounded-[5px] text-sm font-medium flex items-center gap-1.5 transition-all",
                         view === "list"
                           ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100"
                           : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                       )}
                     >
                       <List className="w-3.5 h-3.5" />
                       {t("appts_list")}
                     </button>
                     <button
                       role="tab"
                       aria-selected={view === "calendar"}
                       onClick={() => setView("calendar")}
                       className={cn(
                         "px-3 py-1.5 rounded-[5px] text-sm font-medium flex items-center gap-1.5 transition-all",
                         view === "calendar"
                           ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100"
                           : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                       )}
                     >
                       <CalendarDays className="w-3.5 h-3.5" />
                       {t("appts_calendar")}
                     </button>
                 </div>
             </div>
         </div>
         
         {view === "calendar" ? (
           <div className="flex-1 overflow-auto min-h-0">
             <FullScreenCalendar
               events={calendarEvents}
               onEventClick={(ev) => setEditAptId(ev.id)}
             />
           </div>
         ) : (
         <div className="p-0 overflow-x-auto flex-1">
             <table className="w-full text-sm text-left">
                 <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
<tr>
                          <th className="px-6 py-4 border-b">{t("appts_colTime")}</th>
                          <th className="px-6 py-4 border-b">{t("appts_colPatient")}</th>
                          <th className="px-6 py-4 border-b">{t("appts_colType")}</th>
                          <th className="px-6 py-4 border-b hidden md:table-cell">{t("appts_colProvider")}</th>
                          <th className="px-6 py-4 border-b">{t("appts_status")}</th>
                          <th className="px-6 py-4 border-b">{t("common_actions")}</th>
                      </tr>
                 </thead>
                 <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                     {pagedAppointments.map((apt: Appointment) => {
                         const patient = patients.find(p => p.id === apt.patientId);
                         const patientName = patient ? `${patient.firstName} ${patient.lastName}` : t("appts_unknownPatient");
                         const statusKey = (apt.status ?? "").toLowerCase();
                         return (
                         <tr key={apt.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
<td className="px-6 py-4">
                                 <div className="font-medium">{apt.time}</div>
                                 <div className="text-xs text-neutral-500 flex items-center mt-1">
                                     <Clock className="w-3 h-3 mr-1" /> {apt.duration}
                                 </div>
{apt.tokenNumber ? (
                                   <span className="mt-1 inline-flex items-center gap-1 rounded-[5px] bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                     {apt.isWalkIn ? t("appts_walkIn") : t("appts_queue")} · {apt.tokenNumber}
                                   </span>
                                 ) : null}
                               </td>
                              <td className="px-6 py-4 font-medium">{patientName}</td>
                              <td className="px-6 py-4">{apptTypeLabel(apt.type)}</td>
                              <td className="px-6 py-4 hidden md:table-cell text-neutral-500">{apt.provider}</td>
                              <td className="px-6 py-4">
<span className={`px-2 py-1 rounded-[5px] text-xs font-medium ${
                                        statusKey === "confirmed" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                        statusKey === "arrived" || statusKey === "in waiting room" || statusKey === "in_progress" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                        statusKey === "scheduled" || statusKey === "pending" ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" :
                                        statusKey === "cancelled" ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" :
                                        statusKey === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        "bg-neutral-100 text-neutral-500"
                                    }`}>
                                     {statusLabel(apt.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                 <Button
                                   variant="link"
                                   className="text-indigo-600 hover:text-indigo-700 p-0 h-auto mr-3"
                                   onClick={() => setEditAptId(apt.id)}
                                 >
                                   {t("appts_edit")}
                                 </Button>
                                 <Button variant="link" className="text-neutral-400 hover:text-red-600 p-0 h-auto" onClick={() => { updateAppointment(apt.id, { status: "Cancelled" }); toast.success(t("appts_cancelled")); }}>{t("appts_cancel")}</Button>
                                 {!apt.isWalkIn && (apt.status ?? "").toLowerCase() !== "cancelled" ? (
                                   <Button variant="link" className="text-violet-600 hover:text-violet-700 p-0 h-auto" onClick={() => {
                                     updateAppointment(apt.id, {
                                       status: "In Waiting Room",
                                       isWalkIn: true,
                                     });
                                     toast.success(t("appts_markedWalkIn"));
                                   }}>{t("appts_walkIn")}</Button>
                                 ) : null}
                              </td>
                         </tr>
                     )})}
                 </tbody>
             </table>
         </div>
         )}
         {view === "list" && filteredAppointments.length > PAGE_SIZE ? (
           <DataPagination
             page={visiblePage}
             pageSize={PAGE_SIZE}
             total={filteredAppointments.length}
             onPageChange={setPage}
           />
         ) : null}
      </div>

      {editAptId && (() => {
        const apt = appointments.find((a) => a.id === editAptId)
        if (!apt) return null
        const patient = patients.find((p) => p.id === apt.patientId)
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : t("appts_unknownPatient")
        return (
          <EditAppointmentDialog
            key={apt.id}
            apt={apt}
            patientName={patientName}
            onSave={(data) => {
              handleEdit(apt.id, data)
              setEditAptId(null)
            }}
            onCancel={() => setEditAptId(null)}
          />
        )
      })()}
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <React.Suspense fallback={<div className="flex-1" />}>
      <AppointmentsPageContent />
    </React.Suspense>
  )
}
