"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CalendarCheck2, ClipboardList, Stethoscope, Users } from "lucide-react";
import Link from "next/link";
import { useMedical } from "@/context/MedicalContext";
import { useRoles } from "@/context/RoleContext";
import { useLocale } from "@/components/locale/locale-provider";
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
      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
      status?.toLowerCase() === "confirmed" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      (status?.toLowerCase() === "scheduled" ||
        status?.toLowerCase() === "in waiting room" ||
        status?.toLowerCase() === "in_waiting_room") &&
        "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
      (status?.toLowerCase() === "arrived" || status?.toLowerCase() === "in progress") &&
        "bg-violet-500/12 text-violet-700 dark:text-violet-300",
      status?.toLowerCase() === "completed" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      ACTIVE.has(status?.toLowerCase() ?? "") ? "" : "bg-muted text-muted-foreground",
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
    emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    cyan: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
    violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
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
        className="hero-glow surface-panel relative overflow-hidden rounded-[34px] border border-white/60 px-6 py-7 dark:border-white/6 sm:px-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary dark:border-white/8 dark:bg-white/[0.04]">
          <Stethoscope className="h-3.5 w-3.5" />
          {t("doctor_boardTitle")}
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          {t("doctor_boardSubtitle")}
        </h2>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="surface-panel flex items-start justify-between rounded-[28px] border border-white/60 p-6 dark:border-white/6"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {stat.value}
              </h3>
            </div>
            <div className={cn("rounded-[18px] p-3", accent[stat.color as keyof typeof accent])}>
              <stat.icon className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="surface-panel rounded-[30px] border border-white/60 p-6 dark:border-white/6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
              {t("doctor_todaySchedule")}
            </h2>
            <Link
              href="/queue"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("common_view_all")}
            </Link>
          </div>
          {myAppointmentsToday.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{t("doctor_noAppointments")}</p>
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
                    className="flex items-center gap-4 rounded-[22px] px-4 py-3 transition-colors hover:bg-white/65 dark:hover:bg-white/[0.04]"
                  >
                    <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-foreground ltr-on-rtl">
                      {time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{appointment.type}</p>
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

        <div className="surface-panel rounded-[30px] border border-white/60 p-6 dark:border-white/6">
          <h2 className="mb-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
            {t("doctor_upcoming")}
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("doctor_noAppointments")}</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((appointment) => {
                const patient = patients.find((p) => p.id === appointment.patientId);
                const name = patient ? `${patient.firstName} ${patient.lastName}` : "—";
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between rounded-[22px] px-3 py-3 transition-colors hover:bg-white/65 dark:hover:bg-white/[0.04]"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <p className="text-xs text-muted-foreground">
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