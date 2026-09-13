import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { PrintButton } from "@/components/print/print-button";
import { SendRxButton } from "@/components/print/send-rx-button";
import { CloneRxButton } from "@/components/prescriptions/clone-rx-button";

export default async function PrescriptionPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const organizationId = session.user.organizationId;

  const prescription = await prisma.prescription.findFirst({
    where: { id: (await params).id, organizationId },
    select: {
      id: true,
      patientId: true,
      encounterId: true,
      medicationName: true,
      dosage: true,
      frequency: true,
      duration: true,
      instructions: true,
      createdAt: true,
      items: { select: { id: true, medicationName: true, dosage: true, frequency: true, duration: true, instructions: true } },
      patient: {
        select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true },
      },
      prescriber: { select: { name: true, specialty: true } },
      organization: { select: { name: true, phone: true, address: true } },
    },
  });

  if (!prescription) notFound();

  const t = await getDictionary();

  const hasItems = prescription.items.length > 0;
  const medLines = hasItems
    ? prescription.items
    : [
        {
          id: "rx",
          medicationName: prescription.medicationName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          instructions: prescription.instructions,
        },
      ];

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-[560px]">
        <div className="mb-4 flex items-center justify-between gap-2 print-hide">
          <Link
            href="/encounters"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t["timeline_backToPatients"]}
          </Link>
          <div className="flex items-center gap-2">
            <CloneRxButton
              prescription={prescription}
              patientId={prescription.patientId}
              patientName={`${prescription.patient.firstName} ${prescription.patient.lastName}`}
              encounterId={prescription.encounterId ?? undefined}
            />
            <SendRxButton rxId={prescription.id} t={t} />
            <PrintButton />
          </div>
        </div>

        <div className="print-sheet rounded-lg border border-border bg-card p-8 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-content-center rounded-md bg-primary text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{prescription.organization.name}</p>
                <p className="text-xs text-muted-foreground">
                  {prescription.organization.address ?? ""}
                  {prescription.organization.phone ? ` · ${prescription.organization.phone}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Rx
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t["print_patient"]}</p>
              <p className="mt-1 font-semibold text-foreground">
                {prescription.patient.firstName} {prescription.patient.lastName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                MRN {prescription.patient.mrn ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t["print_doctor"]}</p>
              <p className="mt-1 font-semibold text-foreground">{prescription.prescriber.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {prescription.prescriber.specialty ?? ""}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            {hasItems ? (
              <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">{t["print_medication"]}</th>
                    <th className="pb-2 pr-3 font-medium">{t["print_dosage"]}</th>
                    <th className="pb-2 pr-3 font-medium">{t["print_frequency"]}</th>
                    <th className="pb-2 pr-3 font-medium">{t["print_duration"]}</th>
                    <th className="pb-2 font-medium">{t["print_instructions"]}</th>
                  </tr>
                </thead>
                <tbody>
                  {medLines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2.5 pr-3 font-semibold text-foreground">{line.medicationName}</td>
                      <td className="py-2.5 pr-3 ltr-on-rtl">{line.dosage ?? "—"}</td>
                      <td className="py-2.5 pr-3 ltr-on-rtl">{line.frequency ?? "—"}</td>
                      <td className="py-2.5 pr-3 ltr-on-rtl">{line.duration ?? "—"}</td>
                      <td className="py-2.5">{line.instructions ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <div>
                <p className="text-xl font-semibold text-foreground">{prescription.medicationName}</p>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t["print_dosage"]}</p>
                    <p className="mt-0.5 font-medium ltr-on-rtl">{prescription.dosage ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t["print_frequency"]}</p>
                    <p className="mt-0.5 font-medium ltr-on-rtl">{prescription.frequency ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t["print_duration"]}</p>
                    <p className="mt-0.5 font-medium ltr-on-rtl">{prescription.duration ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t["print_date"]}</p>
                    <p className="mt-0.5 font-medium">
                      {new Intl.DateTimeFormat().format(prescription.createdAt)}
                    </p>
                  </div>
                </div>
                {prescription.instructions ? (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">{t["print_instructions"]}</p>
                    <p className="mt-1 text-sm">{prescription.instructions}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-10 flex items-end justify-between gap-4">
            <p className="text-xs text-muted-foreground">{t["print_signature"]}</p>
            <div className="w-40 border-b border-foreground/60 pb-0.5" />
          </div>
        </div>
      </div>
    </main>
  );
}