"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CalendarCheck2, ClipboardList, Play, Stethoscope, Users } from "lucide-react";
import Link from "next/link";
import { useMedical } from "@/context/MedicalContext";
import { useRoles } from "@/context/RoleContext";
import { useLocale } from "@/components/locale/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logClientError } from "@/lib/client-logger";

const ACTIVE = new Set(["scheduled", "confirmed", "arrived", "in progress", "in waiting room", "in_waiting_room"]);

type PrescriptionSummary = {
  id: string;
  prescribedById?: string | null;
  createdAt?: string;
  medicationName: string;
};

export function DoctorBoard() {
  const { t } = useLocale();
  const { appointments, patients } = useMedical();
  const { userId } = useRoles();
  const [myRxCount, setMyRxCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/prescriptions")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: PrescriptionSummary[]) => {
        if (!cancelled && Array.isArray(data)) {
          setMyRxCount(data.filter((rx) => rx.prescribedById === userId).length);
        }
      })
      .catch((error) => logClientError("Fetch prescriptions in doctor board failed", error));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const today = React.useMemo(() => new Date().toISOString().split("T")[0], []);
  const [nowMs] = React.useState(() => Date.now());

  const isCancelled = (status?: string | null) => status?.toLowerCase() === "cancelled";

  const myAppointmentsToday = React.useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.providerId === userId &&
            a.date === today &&
            !isCancelled(a.status) &&
            ACTIVE.has(a.status?.toLowerCase()),
        )
        .sort((a, b) => (a.startTime ?? `${a.date}T${a.time}`).localeCompare(b.startTime ?? `${b.date}T${b.time}`)),
    [appointments, userId, today],
  );

  const patientsToday = React.useMemo(
    () => new Set(myAppointmentsToday.map((a) => a.patientId)).size,
    [myAppointmentsToday],
  );

  const upcoming = React.useMemo(() => {
    const getMs = (a: (typeof appointments)[number]) =>
      a.startTime ? new Date(a.startTime).getTime() : new Date(`${a.date}T${a.time}`).getTime();
    return appointments
      .filter((a) => a.providerId === userId && !isCancelled(a.status) && getMs(a) >= nowMs)
      .sort((a, b) => getMs(a) - getMs(b))
      .slice(0, 4);
  }, [appointments, userId, nowMs]);

  const statusChip = (status?: string | null) =>
    cn(
      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize border",
      status?.toLowerCase() === "confirmed" && "bg-success-bg text-success-text border-success/30",
      (status?.toLowerCase() === "scheduled" ||
        status?.toLowerCase() === "in waiting room" ||
        status?.toLowerCase() === "in_waiting_room") &&
        "bg-primary/10 text-primary border-primary/20",
      (status?.toLowerCase() === "arrived" || status?.toLowerCase() === "in progress") &&
        "bg-accent-blue-bg text-accent-blue-text border-accent-blue/30",
      status?.toLowerCase() === "completed" && "bg-success-bg text-success-text border-success/30",
      ACTIVE.has(status?.toLowerCase() ?? "") ? "" : "bg-muted-bg text-muted-foreground border-border",
    );

  const stats = [
    {
      label: t("doctor_todayAppointments"),
      value: myAppointmentsToday.length.toString(),
      icon: CalendarCheck2,
      color: "emerald",
    },
    {
      label: t("doctor_myPatients"),
      value: patientsToday.toString(),
      icon: Users,
      color: "cyan",
    },
    {
      label: t("doctor_myPrescriptions"),
      value: myRxCount === null ? "…" : myRxCount.toString(),
      icon: ClipboardList,
      color: "violet",
    },
  ];

  const accent = {
    emerald: "bg-success-bg text-success-text border border-success/30",
    cyan: "bg-primary/10 text-primary border border-primary/20",
    violet: "bg-accent-blue-bg text-accent-blue-text border border-accent-blue/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex w-full flex-col gap-6 pb-6"
    >
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-2xs sm:p-8"
      >
        <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Stethoscope className="h-3.5 w-3.5" />
          {t("doctor_boardTitle")}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("doctor_boardSubtitle")}
        </h1>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-start justify-between rounded-lg border border-border bg-card p-5 shadow-2xs"
          >
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </h3>
            </div>
            <div className={cn("rounded-md p-2.5", accent[stat.color as keyof typeof accent])}>
              <stat.icon className="h-4 w-4" strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-2xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              {t("doctor_todaySchedule")}
            </h2>
            <Link
              href="/queue"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("common_view_all")}
            </Link>
          </div>
          {myAppointmentsToday.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t("doctor_noAppointments")}</p>
          ) : (
            <div className="space-y-2">
              {myAppointmentsToday.map((appointment) => {
                const patient = patients.find((p) => p.id === appointment.patientId);
                const name = patient ? `${patient.firstName} ${patient.lastName}` : "—";
                const time = appointment.startTime
                  ? new Date(appointment.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : appointment.time;
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-3 rounded-md border border-border/50 bg-muted-bg/50 px-3.5 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="w-16 shrink-0 font-mono text-xs font-bold tabular-nums text-foreground ltr-on-rtl">
                      {time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{appointment.type}</p>
                    </div>
                    <span className={statusChip(appointment.status)}>
                      {appointment.status ?? "—"}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 shrink-0 px-2 text-xs" asChild>
                      <Link href={`/patients/${appointment.patientId}`}>
                        <Play className="mr-1 h-3 w-3" />
                        {t("common_start")}
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-2xs">
          <h2 className="mb-4 border-b border-border pb-3 text-sm font-bold tracking-tight text-foreground">
            {t("doctor_upcoming")}
          </h2>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t("doctor_noAppointments")}</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((appointment) => {
                const patient = patients.find((p) => p.id === appointment.patientId);
                const name = patient ? `${patient.firstName} ${patient.lastName}` : "—";
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between rounded-md border border-border/50 bg-muted-bg/50 p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <span className="text-xs font-semibold text-foreground">{name}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {appointment.date} · {appointment.time}
                      </p>
                    </div>
                    <span className={statusChip(appointment.status)}>
                      {appointment.status ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}