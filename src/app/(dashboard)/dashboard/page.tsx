"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bell,
  Calendar,
  Eye,
  HeartPulse,
  Users,
} from "lucide-react";;
import Link from "next/link";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMedical, Patient } from "@/context/MedicalContext";
import { useRoles } from "@/context/RoleContext";
import { DoctorBoard } from "@/components/dashboard/doctor-board";
import { ReceptionBoard } from "@/components/dashboard/reception-board";
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet";
import { AddPatientDialog } from "@/components/patients/add-patient-dialog";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale/locale-provider";

export default function DashboardPage() {
  const { roles } = useRoles();
  const { t, lang } = useLocale();
  const { patients, appointments, refetchPatients } = useMedical();

  const isDoctor = roles.includes("Doctor");
  const isReception = roles.includes("Care Coordinator");

  const [today] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [now] = React.useState(() => Date.now());
  const cancelledStatus = (status: string) => status?.toLowerCase() === "cancelled";
  const noShowStatus = (status: string) =>
    status?.toLowerCase() === "no_show" ||
    status?.toLowerCase() === "no-show" ||
    status?.toLowerCase() === "no show";

  const appointmentsToday = appointments.filter(
    (appointment) => appointment.date === today && !cancelledStatus(appointment.status),
  );

  const cancelledToday = appointments.filter(
    (appointment) => appointment.date === today && cancelledStatus(appointment.status),
  ).length;

  const noShowToday = appointments.filter(
    (appointment) => appointment.date === today && noShowStatus(appointment.status),
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) => appointment.status?.toLowerCase() === "confirmed",
  ).length;

  const activeEncounters = appointments.filter(
    (appointment) =>
      appointment.status?.toLowerCase() === "in waiting room" ||
      appointment.status?.toLowerCase() === "confirmed",
  ).length;

  const activePatients = patients.filter(
    (patient) => patient.status?.toLowerCase() === "active",
  ).length;

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthVisits = patients.filter(
    (patient) => patient.lastVisit && new Date(patient.lastVisit) >= monthStart,
  ).length;

  const cancelledOrNoShow = appointments.filter(
    (appointment) => cancelledStatus(appointment.status) || noShowStatus(appointment.status),
  ).length;
  const overallCount = appointments.length;

  const activePatientsPct = patients.length
    ? Math.round((activePatients / patients.length) * 100)
    : 0;
  const cancellationRate = overallCount ? Math.round((cancelledOrNoShow / overallCount) * 100) : 0;
  const monthVisitsPct = patients.length ? Math.round((monthVisits / patients.length) * 100) : 0;

  const getAppointmentTime = (appointment: {
    startTime?: string;
    date: string;
    time: string;
  }) =>
    appointment.startTime
      ? new Date(appointment.startTime).getTime()
      : new Date(`${appointment.date}T${appointment.time}`).getTime();

  const upcomingAppointments = appointments
    .filter((appointment) => {
      if (cancelledStatus(appointment.status)) return false;
      return getAppointmentTime(appointment) >= now;
    })
    .sort((a, b) => getAppointmentTime(a) - getAppointmentTime(b))
    .slice(0, 5);

  const stats = [
    {
      name: t("dash_totalPatients"),
      value: patients.length.toLocaleString(),
      detail: `${activePatients} ${t("dash_active")}`,
      icon: Users,
      color: "cyan",
    },
    {
      name: t("dash_appointmentsToday"),
      value: appointmentsToday.length.toString(),
      detail: `${upcomingAppointments.length} ${t("dash_upcoming")}`,
      icon: Calendar,
      color: "emerald",
    },
    {
      name: t("dash_activeEncounters"),
      value: activeEncounters.toString(),
      detail: `${confirmedCount} ${t("appts_statusConfirmed")}`,
      icon: Activity,
      color: "violet",
    },
    {
      name: t("dash_cancelledToday"),
      value: cancelledToday.toString(),
      detail: `${noShowToday} ${t("dash_noShow")}`,
      icon: Bell,
      color: "amber",
    },
  ];

  const quickStats = [
    {
      label: t("dash_activePatients"),
      value: `${activePatientsPct}%`,
      pct: activePatientsPct,
      color: "cyan",
    },
    {
      label: t("dash_cancellationRate"),
      value: `${cancellationRate}%`,
      pct: cancellationRate,
      color: "amber",
    },
    {
      label: t("dash_visitedThisMonth"),
      value: `${monthVisitsPct}%`,
      pct: monthVisitsPct,
      color: "emerald",
    },
  ];

  const activityItems = React.useMemo(() => {
    const items: Array<{
      icon: typeof Users;
      title: string;
      desc: string;
      time: string;
      color: "cyan" | "emerald" | "violet" | "amber" | "red";
    }> = [];

    const recentVisits = [...patients]
      .filter((patient) => patient.lastVisit)
      .sort(
        (a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime(),
      )
      .slice(0, 3);

    recentVisits.forEach((patient) => {
      items.push({
        icon: Users,
        title: t("dash_actLastVisit"),
        desc: `${patient.firstName} ${patient.lastName}`,
        time: new Date(patient.lastVisit).toLocaleDateString(),
        color: "cyan",
      });
    });

    upcomingAppointments.slice(0, 2).forEach((appointment) => {
      const patient = patients.find((entry) => entry.id === appointment.patientId);
      const name = patient ? `${patient.firstName} ${patient.lastName}` : t("dash_patient");
      items.push({
        icon: Calendar,
        title: t("dash_actApptScheduled"),
        desc: `${name} · ${appointment.date} ${appointment.time}`,
        time: appointment.date,
        color: "emerald",
      });
    });

    return items.slice(0, 5);
  }, [appointments, patients, t, upcomingAppointments]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 280, damping: 26 },
    },
  };

  const colorMap = {
    cyan: "bg-cyan-50 text-cyan-800 border border-cyan-200",
    emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    violet: "bg-purple-50 text-purple-800 border border-purple-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    red: "bg-red-50 text-red-700 border border-red-200",
  };

  if (isDoctor) return <DoctorBoard />;
  if (isReception) return <ReceptionBoard />;

  return (
    <motion.div
      className="flex w-full flex-col gap-6 pb-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-lg border border-border bg-white p-6 shadow-2xs sm:p-8"
      >
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <HeartPulse className="h-3.5 w-3.5" />
              {t("dash_dailyCareboard")}
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("dash_heroTitle")}
            </h1>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t("dash_heroBody")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                label: t("dash_liveQueue"),
                value: lang === "ar" ? `${t("dash_active")} ${activeEncounters}` : `${activeEncounters} ${t("dash_active")}`,
                copy: t("dash_patientsInFlow"),
              },
              {
                label: t("dash_today"),
                value: lang === "ar" ? `${t("dash_visits")} ${appointmentsToday.length}` : `${appointmentsToday.length} ${t("dash_visits")}`,
                copy: t("dash_apptsNotCancelled"),
              },
              {
                label: t("dash_momentum"),
                value:
                  cancelledToday === 0 && noShowToday === 0
                    ? t("dash_lowNoShow")
                    : cancelledToday.toString(),
                copy:
                  cancelledToday === 0 && noShowToday === 0
                    ? t("dash_scheduleConfidence")
                    : t("dash_cancelledToday"),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-[#F8FAFC] p-3.5"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1.5 text-base font-bold text-foreground">{item.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <motion.div
            variants={itemVariants}
            key={stat.name}
            className="group relative overflow-hidden rounded-lg border border-border bg-white p-5 shadow-2xs transition hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{stat.name}</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </h3>
              </div>
              <div
                className={cn(
                  "rounded-md p-2.5 transition-transform duration-200 group-hover:scale-105",
                  colorMap[stat.color as keyof typeof colorMap],
                )}
              >
                <stat.icon className="h-4 w-4" strokeWidth={2} />
              </div>
            </div>

            <div className="mt-3 flex items-center text-xs text-muted-foreground">
              {stat.detail}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-border bg-white p-5 shadow-2xs"
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t("dash_recentActivity")}
              </h2>
              <Button
                variant="link"
                className="h-auto p-0 text-xs font-semibold text-primary hover:underline"
                asChild
              >
                <Link href="/patients" className="inline-flex items-center gap-1">
                  {t("common_view_all")}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </Button>
            </div>

            <div className="space-y-2">
              {activityItems.map((activity, index) => (
                <div
                  key={`${activity.title}-${index}`}
                  className="flex cursor-default items-center gap-3 rounded-md border border-border/50 bg-[#F8FAFC] p-3 transition-colors hover:bg-muted/50"
                >
                  <div className={cn("grid size-8 shrink-0 place-content-center rounded-md", colorMap[activity.color])}>
                    <activity.icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {activity.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{activity.desc}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-mono text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-border bg-white p-5 shadow-2xs"
          >
            <h2 className="mb-4 border-b border-border pb-3 text-sm font-bold tracking-tight text-foreground">
              {t("dash_quickStats")}
            </h2>
            <div className="space-y-3.5">
              {quickStats.map((quickStat, index) => (
                <div key={quickStat.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{quickStat.label}</span>
                    <span className="text-xs font-bold text-foreground">
                      {quickStat.value}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(quickStat.pct, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                      className={cn(
                        "h-full rounded-full",
                        quickStat.color === "cyan" && "bg-cyan-600",
                        quickStat.color === "amber" && "bg-amber-600",
                        quickStat.color === "emerald" && "bg-emerald-600",
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-border bg-white p-5 shadow-2xs"
          >
            <h2 className="mb-4 border-b border-border pb-3 text-sm font-bold tracking-tight text-foreground">
              {t("dash_upcomingAppointments")}
            </h2>
            <div className="space-y-2">
              {upcomingAppointments.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">{t("dash_noUpcoming")}</p>
              ) : (
                upcomingAppointments.map((appointment) => {
                  const patient = patients.find((entry) => entry.id === appointment.patientId);
                  const name = patient ? `${patient.firstName} ${patient.lastName}` : "—";

                  return (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-[#F8FAFC] p-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <span className="text-xs font-semibold text-foreground">{name}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {appointment.date} · {appointment.time} · {appointment.type}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize border",
                          appointment.status?.toLowerCase() === "confirmed" &&
                            "bg-emerald-50 text-emerald-800 border-emerald-200",
                          (appointment.status?.toLowerCase() === "scheduled" ||
                            appointment.status?.toLowerCase() === "in waiting room") &&
                            "bg-cyan-50 text-cyan-800 border-cyan-200",
                          appointment.status?.toLowerCase() === "pending" &&
                            "bg-amber-50 text-amber-800 border-amber-200",
                          !appointment.status && "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {appointment.status?.toLowerCase() === "confirmed" && t("appts_statusConfirmed")}
                      {appointment.status?.toLowerCase() === "scheduled" && t("appts_statusScheduled")}
                      {appointment.status?.toLowerCase() === "in waiting room" && t("appts_statusWaitingRoom")}
                      {appointment.status?.toLowerCase() === "pending" && t("appts_statusPending")}
                      {!appointment.status && "—"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-lg border border-border bg-white shadow-2xs"
      >
        <div className="flex items-center justify-between border-b border-border bg-[#F8FAFC] p-4 sm:px-6">
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            {t("dash_recentPatients")}
          </h2>
          <AddPatientDialog onSuccess={refetchPatients} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("dash_name")}</th>
                <th className="px-4 py-3">{t("dash_idMrn")}</th>
                <th className="px-4 py-3">{t("dash_lastVisit")}</th>
                <th className="px-4 py-3">{t("common_status")}</th>
                <th className="px-4 py-3">{t("common_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {patients.slice(0, 5).map((patient: Patient) => (
                <tr
                  key={patient.id}
                  className="transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-semibold">
                    {patient.firstName} {patient.lastName}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{patient.mrn}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(patient.lastVisit).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {patient.status?.toLowerCase() === "active" && t("patients_active")}
                      {patient.status?.toLowerCase() === "inactive" && t("patients_inactive")}
                      {patient.status?.toLowerCase() === "archived" && t("patients_archived")}
                      {patient.status &&
                        patient.status.toLowerCase() !== "active" &&
                        patient.status.toLowerCase() !== "inactive" &&
                        patient.status.toLowerCase() !== "archived" &&
                        patient.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-xs font-semibold text-primary hover:underline"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />{t("dash_viewProfile")}
                        </Button>
                      </SheetTrigger>
                      <PatientProfileSheet patient={patient} />
                    </Sheet>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
