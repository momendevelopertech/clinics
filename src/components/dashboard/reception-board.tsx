"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CalendarCheck2, ClipboardCheck, UserX, Wallet, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useMedical } from "@/context/MedicalContext";
import { useLocale } from "@/components/locale/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logClientError } from "@/lib/client-logger";

type Action = "check-in" | "check-out" | "no-show";

export function ReceptionBoard() {
  const { t } = useLocale();
  const { appointments, patients, refetchAppointments } = useMedical();
  const [busy, setBusy] = React.useState<string | null>(null);

  const today = React.useMemo(() => new Date().toISOString().split("T")[0], []);

  const todayAppointments = React.useMemo(
    () =>
      appointments
        .filter((a) => a.date === today)
        .sort((a, b) => (a.startTime ?? `${a.date}T${a.time}`).localeCompare(b.startTime ?? `${b.date}T${b.time}`)),
    [appointments, today],
  );

  const count = (pred: (s: string) => boolean) =>
    todayAppointments.filter((a) => pred(a.status?.toLowerCase() ?? "")).length;

  const waiting = count((s) => s === "scheduled" || s === "in waiting room" || s === "in_waiting_room");
  const attended = count((s) => s === "arrived" || s === "in progress");
  const completed = count((s) => s === "completed");
  const noShow = count((s) => s === "no_show" || s === "no-show" || s === "no show");

  const canAct = (status?: string | null) => {
    const s = status?.toLowerCase() ?? "";
    return s === "scheduled" || s === "arrived" || s === "in waiting room" || s === "in_waiting_room" || s === "in progress";
  };

  const runAction = async (id: string, action: Action) => {
    setBusy(id);
    try {
      const r = await fetch(`/api/appointments/${id}/${action}`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(data.error || t("reception_checkIn"));
      } else {
        toast.success(t("reception_boardTitle"));
        void refetchAppointments();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      logClientError("Reception action failed", error);
    } finally {
      setBusy(null);
    }
  };

  const stats = [
    { label: t("reception_waiting"), value: waiting, icon: CalendarCheck2, color: "cyan" },
    { label: t("reception_attended"), value: attended, icon: ClipboardCheck, color: "violet" },
    { label: t("reception_completed"), value: completed, icon: Wallet, color: "emerald" },
    { label: t("reception_noShow"), value: noShow, icon: UserX, color: "red" },
  ];

  const accent = {
    cyan: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
    violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    red: "bg-red-500/12 text-red-700 dark:text-red-300",
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
          <ClipboardCheck className="h-3.5 w-3.5" />
          {t("reception_boardTitle")}
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          {t("reception_boardSubtitle")}
        </h2>
      </motion.section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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

      <div className="surface-panel rounded-[30px] border border-white/60 p-6 dark:border-white/6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            {t("reception_todayQueue")}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{today}</span>
            <Link href="/queue" className="font-medium text-primary hover:underline">
              {t("common_view_all")}
            </Link>
          </div>
        </div>
        {todayAppointments.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{t("reception_noAppointments")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-white/60 dark:border-white/6">
                  <th className="py-3 pr-3 font-medium">{t("doctor_time")}</th>
                  <th className="py-3 pr-3 font-medium">{t("doctor_patient")}</th>
                  <th className="py-3 pr-3 font-medium">{t("doctor_type")}</th>
                  <th className="py-3 pr-3 font-medium">{t("reception_visit")}</th>
                  <th className="py-3 pr-3 font-medium">{t("doctor_status")}</th>
                  <th className="py-3 font-medium">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-foreground dark:divide-white/6">
                {todayAppointments.map((appointment) => {
                  const patient = patients.find((p) => p.id === appointment.patientId);
                  const name = patient ? `${patient.firstName} ${patient.lastName}` : "—";
                  const time = appointment.startTime
                    ? new Date(appointment.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : appointment.time;
                  return (
                    <tr key={appointment.id} className="transition-colors hover:bg-white/45 dark:hover:bg-white/[0.03]">
                      <td className="py-3 pr-3 font-semibold tabular-nums ltr-on-rtl">{time}</td>
                      <td className="py-3 pr-3 font-medium">{name}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{appointment.type}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {appointment.provider ?? "—"}
                      </td>
                      <td className="py-3 pr-3 capitalize">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {appointment.status ?? "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        {canAct(appointment.status) ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === appointment.id}
                              onClick={() => void runAction(appointment.id, "check-in")}
                            >
                              {t("reception_checkIn")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === appointment.id}
                              onClick={() => void runAction(appointment.id, "check-out")}
                            >
                              {t("reception_checkOut")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy === appointment.id}
                              onClick={() => void runAction(appointment.id, "no-show")}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              {t("reception_markNoShow")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}