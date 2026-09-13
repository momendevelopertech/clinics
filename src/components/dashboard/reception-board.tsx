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
    cyan: "bg-cyan-50 text-cyan-800 border border-cyan-200",
    violet: "bg-purple-50 text-purple-800 border border-purple-200",
    emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    red: "bg-red-50 text-red-700 border border-red-200",
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
        className="relative overflow-hidden rounded-lg border border-border bg-white p-6 shadow-2xs sm:p-8"
      >
        <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {t("reception_boardTitle")}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("reception_boardSubtitle")}
        </h1>
      </motion.section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-start justify-between rounded-lg border border-border bg-white p-5 shadow-2xs"
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

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-border bg-[#F8FAFC] p-4 sm:px-6">
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            {t("reception_todayQueue")}
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{today}</span>
            <Link href="/queue" className="font-semibold text-primary hover:underline">
              {t("common_view_all")}
            </Link>
          </div>
        </div>
        {todayAppointments.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("reception_noAppointments")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-border bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("doctor_time")}</th>
                  <th className="px-4 py-3">{t("doctor_patient")}</th>
                  <th className="px-4 py-3">{t("doctor_type")}</th>
                  <th className="px-4 py-3">{t("reception_visit")}</th>
                  <th className="px-4 py-3">{t("doctor_status")}</th>
                  <th className="px-4 py-3">{t("common_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
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
                    <tr key={appointment.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono font-bold tabular-nums ltr-on-rtl">{time}</td>
                      <td className="px-4 py-3 font-semibold">{name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{appointment.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {appointment.provider ?? "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        <span className="rounded-full border border-border bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {appointment.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canAct(appointment.status) ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={busy === appointment.id}
                              onClick={() => void runAction(appointment.id, "check-in")}
                            >
                              {t("reception_checkIn")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={busy === appointment.id}
                              onClick={() => void runAction(appointment.id, "check-out")}
                            >
                              {t("reception_checkOut")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={busy === appointment.id}
                              onClick={() => void runAction(appointment.id, "no-show")}
                            >
                              <X className="mr-1 h-3 w-3" />
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