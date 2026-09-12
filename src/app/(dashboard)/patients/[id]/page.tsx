import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarX2,
  FileText,
  FlaskConical,
  Pill,
  UserX,
  ReceiptText,
  Stethoscope,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { parseOrgSettings } from "@/lib/org-settings";
import { summarizeAttendance } from "@/lib/appointments";
import { TreatmentPlansSection } from "@/components/treatment/treatment-plans-section";
import { VitalsTrendCard } from "@/components/patients/vitals-trend-card";
import { PatientAllergiesCard } from "@/components/patients/patient-allergies-card";

type TimelineEvent = {
  id: string;
  kind:
    | "appointment"
    | "encounter"
    | "prescription"
    | "invoice"
    | "lab"
    | "diagnosis"
    | "followUp"
    | "procedure"
    | "document";
  date: Date;
  title: string;
  subtitle?: string | null;
};

export default async function PatientTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    redirect("/login");
  }
  const organizationId = session.user.organizationId;
  const patientId = (await params).id;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      createdAt: true,
      dateOfBirth: true,
    },
  });

  if (!patient) notFound();

  const [appointments, encounters, prescriptions, invoices, labResults, diagnoses, followUps, procedureOrders, documents] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { patientId, organizationId },
        select: {
          id: true,
          startTime: true,
          updatedAt: true,
          status: true,
          appointmentType: true,
          tokenNumber: true,
          provider: { select: { name: true } },
        },
      }),
      prisma.encounter.findMany({
        where: { patientId, organizationId },
        select: {
          id: true,
          startTime: true,
          encounterType: true,
          status: true,
        },
      }),
      prisma.prescription.findMany({
        where: { patientId, organizationId },
        select: {
          id: true,
          createdAt: true,
          medicationName: true,
          dosage: true,
          prescriber: { select: { name: true } },
        },
      }),
      prisma.invoice.findMany({
        where: { patientId, organizationId },
        select: { id: true, createdAt: true, invoiceNumber: true, totalAmount: true },
      }),
      prisma.labResult.findMany({
        where: { patientId, organizationId },
        select: {
          id: true,
          createdAt: true,
          performedAt: true,
          testName: true,
          resultValue: true,
          status: true,
        },
      }),
      prisma.diagnosis.findMany({
        where: { patientId, organizationId },
        select: { id: true, createdAt: true, code: true, name: true, status: true },
      }),
      prisma.followUp.findMany({
        where: { patientId, organizationId },
        select: { id: true, dueDate: true, createdAt: true, reason: true, status: true },
      }),
      prisma.procedureOrder.findMany({
        where: { patientId, organizationId },
        select: { id: true, createdAt: true, procedureName: true, status: true },
      }),
      prisma.document.findMany({
        where: { patientId, organizationId },
        select: { id: true, createdAt: true, name: true, type: true },
      }),
    ]);

  const t = await getDictionary();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settingsJson: true },
  });
  const orgPolicy = parseOrgSettings(organization?.settingsJson).cancellationPolicy;
  const attendance = summarizeAttendance(appointments, {
    lateCancelHoursBefore: orgPolicy?.lateCancelHoursBefore ?? 24,
    maxNoShows: orgPolicy?.maxNoShows ?? 3,
    noShowFee: orgPolicy?.noShowFee ?? 0,
  });

  const apptStatusLabel = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "confirmed") return t["appts_statusConfirmed"];
    if (lower === "scheduled") return t["appts_statusScheduled"];
    if (lower === "in waiting room") return t["appts_statusWaitingRoom"];
    if (lower === "pending") return t["appts_statusPending"];
    if (lower === "cancelled") return t["reports_cancelled"];
    if (lower === "no_show") return t["timeline_noShow"];
    return status;
  };

  const events: TimelineEvent[] = [
    ...appointments.map((a) => ({
      id: `appt-${a.id}`,
      kind: "appointment" as const,
      date: a.startTime,
      title: [t["timeline_appointment"], a.appointmentType, a.tokenNumber]
        .filter(Boolean)
        .join(" · "),
      subtitle: `${a.provider.name} · ${apptStatusLabel(a.status)}`,
      apptStatus: a.status,
    })),
    ...encounters.map((e) => ({
      id: `enc-${e.id}`,
      kind: "encounter" as const,
      date: e.startTime,
      title: t["timeline_visit"],
      subtitle: e.encounterType ?? null,
    })),
    ...prescriptions.map((p) => ({
      id: `rx-${p.id}`,
      kind: "prescription" as const,
      date: p.createdAt,
      title: [p.medicationName, p.dosage].filter(Boolean).join(" · "),
      subtitle: p.prescriber.name,
    })),
    ...invoices.map((inv) => ({
      id: `inv-${inv.id}`,
      kind: "invoice" as const,
      date: inv.createdAt,
      title: `${inv.invoiceNumber}`,
      subtitle: `$${Number(inv.totalAmount).toFixed(2)}`,
    })),
    ...labResults.map((lab) => ({
      id: `lab-${lab.id}`,
      kind: "lab" as const,
      date: lab.performedAt ?? lab.createdAt,
      title: lab.testName,
      subtitle: lab.resultValue ?? lab.status,
    })),
    ...diagnoses.map((diagnosis) => ({
      id: `diagnosis-${diagnosis.id}`,
      kind: "diagnosis" as const,
      date: diagnosis.createdAt,
      title: `${diagnosis.code} · ${diagnosis.name}`,
      subtitle: diagnosis.status,
    })),
    ...followUps.map((followUp) => ({
      id: `follow-up-${followUp.id}`,
      kind: "followUp" as const,
      date: followUp.dueDate,
      title: followUp.reason,
      subtitle: `${t["timeline_due"]}: ${followUp.status}`,
    })),
    ...procedureOrders.map((procedure) => ({
      id: `procedure-${procedure.id}`,
      kind: "procedure" as const,
      date: procedure.createdAt,
      title: procedure.procedureName,
      subtitle: procedure.status,
    })),
    ...documents.map((document) => ({
      id: `document-${document.id}`,
      kind: "document" as const,
      date: document.createdAt,
      title: document.name,
      subtitle: document.type,
    })),
  ];

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  const iconFor = (event: TimelineEvent) => {
    if (event.kind === "encounter") return Stethoscope;
    if (event.kind === "prescription") return Pill;
    if (event.kind === "invoice") return ReceiptText;
    if (event.kind === "lab") return FlaskConical;
    if (event.kind === "diagnosis") return Stethoscope;
    if (event.kind === "followUp") return CalendarCheck2;
    if (event.kind === "procedure") return Stethoscope;
    if (event.kind === "document") return FileText;
    const status = (event as unknown as { apptStatus?: string }).apptStatus;
    if (status === "cancelled") return CalendarX2;
    if (status === "no_show") return UserX;
    return CalendarCheck2;
  };

  const eventLabel = (event: TimelineEvent) => {
    if (event.kind === "encounter") return t["timeline_visit"];
    if (event.kind === "prescription") return t["timeline_prescription"];
    if (event.kind === "invoice") return t["timeline_invoice"];
    if (event.kind === "lab") return t["timeline_lab"];
    if (event.kind === "diagnosis") return t["timeline_diagnosis"];
    if (event.kind === "followUp") return t["timeline_followUp"];
    if (event.kind === "procedure") return t["timeline_procedure"];
    if (event.kind === "document") return t["timeline_document"];
    const status = (event as unknown as { apptStatus?: string }).apptStatus;
    if (status === "cancelled") return t["timeline_cancelled"];
    if (status === "no_show") return t["timeline_noShow"];
    return t["timeline_appointment"];
  };

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline print-hide"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t["timeline_backToPatients"]}
      </Link>

      <div className="surface-panel rounded-[24px] border border-white/55 p-6 dark:border-white/6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t["timeline_title"]} · {patient.mrn ?? "—"} ·{" "}
              {patient.dateOfBirth
                ? new Intl.DateTimeFormat().format(patient.dateOfBirth)
                : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary print-hide">
            <FileText className="h-4 w-4" />
            {events.length}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {t["timeline_attendance"]}: {attendance.completed} · {attendance.noShows}{" "}
            {t["timeline_noShow"]} · {attendance.lateCancels} {t["timeline_lateCancels"]}
          </span>
          {attendance.flagged && (
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
              {t["timeline_policyFlag"]}
            </span>
          )}
        </div>
      </div>

      <TreatmentPlansSection patientId={patientId} t={t} />

      <VitalsTrendCard patientId={patientId} t={t} />

      <PatientAllergiesCard patientId={patientId} t={t} />

      {events.length === 0 ? (
        <p className="rounded-[20px] border border-white/55 bg-white/60 p-8 text-center text-sm text-muted-foreground dark:border-white/6 dark:bg-white/[0.03]">
          {t["timeline_empty"]}
        </p>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => {
            const Icon = iconFor(event);
            return (
              <li
                key={event.id}
                className="flex gap-4 rounded-[20px] border border-white/55 bg-white/60 p-4 dark:border-white/6 dark:bg-white/[0.03]"
              >
                <div className="grid size-11 shrink-0 place-content-center rounded-[14px] bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {event.title}
                    </p>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {eventLabel(event)}
                    </span>
                  </div>
                  {event.subtitle ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {event.subtitle}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(event.date)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}