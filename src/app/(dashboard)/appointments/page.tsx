"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Ban,
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  List,
  Pencil,
  Save,
  UserPlus,
  X,
} from "lucide-react";
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
import { toast } from "sonner"

import { useMedical, Appointment } from "@/context/MedicalContext"
import { BookAppointmentDialog } from "@/components/features/appointments/book-appointment-dialog"
import { TelehealthLinkDialog } from "@/components/appointments/telehealth-link-dialog"
import { isTelehealthAppointment } from "@/lib/telehealth"
import {
  FullScreenCalendar,
  type CalendarEvent,
} from "@/components/ui/fullscreen-calendar"
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataPagination } from "@/components/ui/data-pagination"
import { paginate } from "@/lib/pagination"
import { useLocale } from "@/components/locale/locale-provider"
import { cn } from "@/lib/utils"
import { FeatureTip } from "@/components/feature-tips/feature-tip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PageHelpBanner } from "@/components/ui/page-help-banner"

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

function EditAppointmentDialog({
  apt,
  patientName,
  providerNames,
  onSave,
  onCancel,
}: {
  apt: Appointment
  patientName: string
  providerNames: string[]
  onSave: (data: { provider: string; date: string; time: string; status: string }) => void
  onCancel: () => void
}) {
  const providerOptions = React.useMemo(() => {
    const current = apt.provider?.trim()
    const names = providerNames.map((name) => name.trim()).filter(Boolean)
    if (current && !names.includes(current)) return [current, ...names]
    return names.length ? names : current ? [current] : []
  }, [apt.provider, providerNames])

  const { t } = useLocale()

  const [provider, setProvider] = React.useState(apt.provider?.trim() || providerNames[0] || "")
  const [date, setDate] = React.useState(apt.date)
  const [time, setTime] = React.useState(toTimeValue(apt.time))
  const [status, setStatus] = React.useState(toStatusValue(apt.status))

  React.useEffect(() => {
    setProvider(apt.provider?.trim() || providerNames[0] || "")
    setDate(apt.date)
    setTime(toTimeValue(apt.time))
    setStatus(toStatusValue(apt.status))
  }, [apt.id, apt.provider, apt.date, apt.time, apt.status, providerNames])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ provider, date, time, status })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
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
              <SearchableSelect
                value={provider || providerOptions[0]}
                onValueChange={setProvider}
                options={providerOptions.map((p) => ({ value: p, label: p }))}
                placeholder={t("appts_selectProvider")}
                triggerClassName="w-full"
                id="edit-provider"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <SearchableSelect
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: "scheduled", label: t("appts_statusScheduled") },
                  { value: "confirmed", label: t("appts_statusConfirmed") },
                  { value: "waiting", label: t("appts_statusWaitingRoom") },
                  { value: "pending", label: t("appts_statusPending") },
                  { value: "in_progress", label: t("appts_statusInProgress") },
                  { value: "completed", label: t("appts_statusCompleted") },
                  { value: "cancelled", label: t("appts_cancel") },
                  { value: "no_show", label: t("appts_statusNoShow") },
                ]}
                placeholder={t("appts_apptStatus")}
                id="edit-status"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-xs"><X />{t("common_cancel")}</Button>
            <Button type="submit" className="h-9 text-xs"><Save />{t("appts_saveChanges")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AppointmentsPageContent() {
  const searchParams = useSearchParams()
  const { appointments, patients, addAppointment, updateAppointment, refetchAppointments } = useMedical()
  const [providers, setProviders] = React.useState<{ id: string; name: string }[]>([])
  const { t } = useLocale()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [view, setView] = React.useState<"list" | "day" | "calendar">("list")
  const [selectedDay, setSelectedDay] = React.useState(() => new Date().toISOString().split("T")[0])
  const [editAptId, setEditAptId] = React.useState<string | null>(null)
  const [providerFilter, setProviderFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)
  const [confirmId, setConfirmId] = React.useState<string | null>(null)
  const [cancelling, setCancelling] = React.useState(false)

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

  const handleConfirmCancel = async () => {
    if (!confirmId) return
    try {
      setCancelling(true)
      await updateAppointment(confirmId, { status: "Cancelled" })
      toast.success(t("appts_cancelled"))
      setConfirmId(null)
    } finally {
      setCancelling(false)
    }
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

  const dayAppointments = React.useMemo(() => {
    return appointments
      .filter((apt) => apt.date === selectedDay && (providerFilter === "all" || apt.provider === providerFilter))
      .slice()
      .sort((a, b) => toTimeValue(a.time).localeCompare(toTimeValue(b.time)))
  }, [appointments, selectedDay, providerFilter])

  const PAGE_SIZE = 10
  const pageCount = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount)
  const pagedAppointments = paginate(filteredAppointments, visiblePage, PAGE_SIZE)
  const preselectedPatientId = searchParams.get("patientId") ?? undefined

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("appts_title")}</h1>
          <p className="text-xs text-muted-foreground">{t("appts_subtitle")}</p>
        </div>
        
        <BookAppointmentDialog
          patients={patients}
          providers={providers}
          appointments={appointments}
          initialPatientId={preselectedPatientId}
          onBook={(data) =>
            addAppointment({
              patientId: data.patientId,
              provider: providers.find((provider) => provider.id === data.providerId)?.name ?? "",
              providerId: data.providerId,
              date: data.date,
              time: data.time,
              type: data.type,
              duration: data.duration,
              status: data.status,
              isWalkIn: data.isWalkIn,
            })
          }
        />
      </div>

      <PageHelpBanner pageKey="appointments" />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xs flex-1 flex flex-col">
         <div className="p-4 sm:px-6 border-b border-border bg-muted-bg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                 <CalendarIcon className="w-4 h-4 text-primary" />
                 {view === "list"
                   ? t("appts_todayList")
                   : view === "day"
                     ? t("appts_dayAgenda")
                     : t("appts_monthView")}
               </div>
               <Input
                  type="search"
                  placeholder={t("appts_searchPlaceholder")}
                  className="h-9 w-full sm:max-w-sm rounded-md bg-card text-xs border-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="flex gap-2">
                  <SearchableSelect
                    value={providerFilter}
                    onValueChange={(value) => {
                      setProviderFilter(value)
                      setPage(1)
                    }}
                    options={[
                      { value: "all", label: t("appts_allProviders") },
                      ...providers.map((provider) => ({ value: provider.name, label: provider.name })),
                    ]}
                    placeholder={t("appts_allProviders")}
                    triggerClassName="w-[180px] h-9 rounded-md bg-card text-xs border-input"
                    contentClassName="text-xs"
                    ariaLabel={t("appts_allProviders")}
                  />
                 <FeatureTip tipId="appointments-views">
                 <div className="bg-muted-bg rounded-md p-1 flex gap-1" role="tablist" aria-label={t("appts_viewMode")}>
                     <button
                       role="tab"
                       aria-selected={view === "list"}
                       onClick={() => setView("list")}
                       className={cn(
                         "px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                         view === "list"
                           ? "bg-card shadow-2xs text-foreground font-bold"
                           : "text-muted-foreground hover:text-foreground"
                       )}
                     >
                       <List className="w-3.5 h-3.5" />
                       {t("appts_list")}
                     </button>
                     <button
                       role="tab"
                       aria-selected={view === "day"}
                       onClick={() => setView("day")}
                       className={cn(
                         "px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                         view === "day"
                           ? "bg-card shadow-2xs text-foreground font-bold"
                           : "text-muted-foreground hover:text-foreground"
                         )}
                       >
                         <Clock className="w-3.5 h-3.5" />
                         {t("appts_day")}
                     </button>
                     <button
                       role="tab"
                       aria-selected={view === "calendar"}
                       onClick={() => setView("calendar")}
                       className={cn(
                         "px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                         view === "calendar"
                           ? "bg-card shadow-2xs text-foreground font-bold"
                           : "text-muted-foreground hover:text-foreground"
                       )}
                     >
                        <CalendarDays className="w-3.5 h-3.5" />
                        {t("appts_calendar")}
                      </button>
                 </div>
                </FeatureTip>
            </div>
           </div>
           
           {view === "calendar" ? (
            <div className="flex-1 overflow-auto min-h-0">
              <FullScreenCalendar
                events={calendarEvents}
                onEventClick={(ev) => setEditAptId(ev.id)}
              />
            </div>
          ) : view === "day" ? (
          <div className="p-5 sm:p-6 overflow-auto flex-1">
            <div className="mb-4 flex items-center gap-3">
              <Label htmlFor="day-picker" className="text-xs font-semibold">{t("appts_selectDay")}</Label>
              <Input id="day-picker" type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="h-9 w-auto text-xs" />
            </div>
            {dayAppointments.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("appts_noDayAppointments")}</p>
            ) : (
              <div className="flex flex-col gap-2">
              {dayAppointments.map((apt) => {
                const patient = patients.find((p) => p.id === apt.patientId)
                const patientName = patient ? `${patient.firstName} ${patient.lastName}` : t("appts_unknownPatient")
                return (
                  <div key={apt.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-muted-bg/50 p-3 text-xs transition-colors hover:bg-muted/40">
                    <span className="font-mono font-bold text-foreground">{apt.time}</span>
                    <span className="font-semibold text-foreground">{patientName}</span>
                    <span className="text-muted-foreground">{apptTypeLabel(apt.type)} · {apt.provider}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-border bg-card text-muted-foreground">{statusLabel(apt.status)}</span>
                    <span className="ms-auto flex items-center gap-3">
                      <Button variant="link" className="text-primary hover:underline p-0 h-auto text-xs font-semibold" onClick={() => setEditAptId(apt.id)}><Pencil className="me-1 h-3.5 w-3.5" />{t("appts_edit")}</Button>
                      <Button variant="link" className="text-muted-foreground hover:text-destructive p-0 h-auto text-xs font-medium" onClick={() => setConfirmId(apt.id)}><Ban className="me-1 h-3.5 w-3.5" />{t("appts_cancel")}</Button>{isTelehealthAppointment(apt.type) ? (<TelehealthLinkDialog appointmentId={apt.id} currentUrl={apt.telehealthUrl} onSuccess={() => void refetchAppointments()} />) : null}
                    </span>
                  </div>
                )
              })}
              </div>
            )}
          </div>
          ) : (
          <div className="p-0 overflow-x-auto flex-1">
              <table className="w-full text-start text-xs">
                  <thead className="border-b border-border bg-muted-bg text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                          <th className="px-4 py-3">{t("appts_colTime")}</th>
                          <th className="px-4 py-3">{t("appts_colPatient")}</th>
                          <th className="px-4 py-3">{t("appts_colType")}</th>
                          <th className="px-4 py-3 hidden md:table-cell">{t("appts_colProvider")}</th>
                          <th className="px-4 py-3">{t("appts_status")}</th>
                          <th className="px-4 py-3">{t("common_actions")}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                      {pagedAppointments.map((apt: Appointment) => {
                          const patient = patients.find(p => p.id === apt.patientId);
                          const patientName = patient ? `${patient.firstName} ${patient.lastName}` : t("appts_unknownPatient");
                          const statusKey = (apt.status ?? "").toLowerCase();
                          return (
                          <tr key={apt.id} className="hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-mono font-bold text-foreground">{apt.time}</div>
                                  <div className="text-[11px] text-muted-foreground flex items-center mt-0.5">
                                      <Clock className="w-3 h-3 me-1" /> {apt.duration}
                                  </div>
                                  {apt.tokenNumber ? (
                                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-accent-blue/30 bg-accent-blue-bg px-2 py-0.5 text-[10px] font-bold text-accent-blue-text">
                                      {apt.isWalkIn ? t("appts_walkIn") : t("appts_queue")} · {apt.tokenNumber}
                                    </span>
                                  ) : null}
                                </td>
                               <td className="px-4 py-3 font-semibold text-foreground">{patientName}</td>
                               <td className="px-4 py-3 text-muted-foreground">{apptTypeLabel(apt.type)}</td>
                               <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{apt.provider}</td>
                               <td className="px-4 py-3">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                    statusKey === "confirmed" && "bg-success-bg text-success-text border-success/30",
                                    (statusKey === "arrived" || statusKey === "in waiting room" || statusKey === "in_progress") && "bg-warning-bg text-warning-text border-warning/30",
                                    (statusKey === "scheduled" || statusKey === "pending") && "bg-primary/10 text-primary border-primary/20",
                                    statusKey === "cancelled" && "bg-critical-bg text-critical-text border-critical/30",
                                    statusKey === "completed" && "bg-success-bg text-success-text border-success/30",
                                    !statusKey && "bg-muted-bg text-muted-foreground border-border"
                                  )}>
                                      {statusLabel(apt.status)}
                                  </span>
                               </td>
                               <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="link"
                                      className="text-primary hover:underline p-0 h-auto text-xs font-semibold"
                                      onClick={() => setEditAptId(apt.id)}
                                    >
                                      <Pencil className="me-1 h-3.5 w-3.5" />{t("appts_edit")}
                                    </Button>
                                    <Button variant="link" className="text-muted-foreground hover:text-destructive p-0 h-auto text-xs font-medium" onClick={() => setConfirmId(apt.id)}><Ban className="me-1 h-3.5 w-3.5" />{t("appts_cancel")}</Button>
                                    {!apt.isWalkIn && (apt.status ?? "").toLowerCase() !== "cancelled" ? (
                                      <FeatureTip tipId="appointments-walkin">
                                      <Button variant="link" className="text-primary hover:underline p-0 h-auto text-xs font-semibold" onClick={() => {
                                        updateAppointment(apt.id, {
                                          status: "In Waiting Room",
                                          isWalkIn: true,
                                        });
                                        toast.success(t("appts_markedWalkIn"));
                                      }}><UserPlus className="me-1 h-3.5 w-3.5" />{t("appts_walkIn")}</Button>
                                      </FeatureTip>
                                    ) : null}
                                    {isTelehealthAppointment(apt.type) ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">{t("tele_badge")}</span>
                                        <TelehealthLinkDialog appointmentId={apt.id} currentUrl={apt.telehealthUrl} onSuccess={() => void refetchAppointments()} />
                                      </span>
                                    ) : null}
                                  </div>
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
            providerNames={providers.map((provider) => provider.name)}
            onSave={(data) => {
              handleEdit(apt.id, data)
              setEditAptId(null)
            }}
            onCancel={() => setEditAptId(null)}
          />
        )
      })()}
      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(open) => { if (!open && !cancelling) setConfirmId(null) }}
        title={t("common_confirmTitle")}
        description={t("common_confirmAction")}
        onConfirm={handleConfirmCancel}
        destructive
        loading={cancelling}
      />
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
