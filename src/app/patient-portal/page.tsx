"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Calendar,
  FileText,
  Heart,
  LogOut,
  MessageSquare,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useVitalsStream } from "@/hooks/use-vitals-stream";
import { logClientError } from "@/lib/client-logger";
import { shouldShowJoinLink } from "@/lib/telehealth";
import { useLocale } from "@/components/locale/locale-provider";
import type { VitalSnapshot } from "@/lib/vitals";

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mrn: string;
}

export default function PatientPortalPage() {
  const { t, lang } = useLocale();
  const [patient, setPatient] = React.useState<PatientData | null>(null);
  const [orgSlug, setOrgSlug] = React.useState<string | null>(null);
  const [appointments, setAppointments] = React.useState<Array<{ id: string; type: string; provider: string; providerId: string; status: string; startTime: string; telehealthUrl?: string | null }>>([]);
  const [documents, setDocuments] = React.useState<Array<{ id: string; name: string; type: string; url: string }>>([]);
  const [invoices, setInvoices] = React.useState<Array<{ id: string; invoiceNumber: string; status: string; totalAmount: number; amountPaid: number; balance: number }>>([]);
  const [consents, setConsents] = React.useState<Array<{ type: string; granted: boolean; signedAt: string | null }>>([]);
  const [reschedulingId, setReschedulingId] = React.useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleSlots, setRescheduleSlots] = React.useState<Array<{ start: string; end: string }>>([]);
  const [rescheduleSlot, setRescheduleSlot] = React.useState("");
  const [workingId, setWorkingId] = React.useState<string | null>(null);
  const [labResults, setLabResults] = React.useState<Array<{ id: string; testName: string; resultValue: string | null; unit: string | null; status: string }>>([]);
  const [overviewVital, setOverviewVital] = React.useState<VitalSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [rateable, setRateable] = React.useState<Array<{ id: string; type: string; provider: string; startTime: string }>>([]);
  const [stars, setStars] = React.useState<Record<string, number>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});
  const router = useRouter();
  const { latestVital, status: vitalsStatus } = useVitalsStream(patient?.id);

  const fetchPatientData = React.useCallback(async () => {
    try {
      setLoading(true);
      const overviewResponse = await fetch("/api/patient-portal/overview");

      if (!overviewResponse.ok) {
        throw new Error("Failed to fetch patient data");
      }

      const overview = await overviewResponse.json();
      setPatient(overview.patient);
      setOrgSlug(overview.organizationSlug ?? null);
      setAppointments(overview.appointments);

      // Documents/invoices/consents are best-effort: failure must not log out.
      const [docsRes, invRes, consRes] = await Promise.all([
        fetch("/api/patient-portal/documents").catch(() => null),
        fetch("/api/patient-portal/invoices").catch(() => null),
        fetch("/api/patient-portal/consents").catch(() => null),
      ]);
      if (docsRes?.ok) {
        const docs = await docsRes.json().catch(() => null);
        if (docs) setDocuments(docs.documents ?? []);
      }
      if (invRes?.ok) {
        const invs = await invRes.json().catch(() => null);
        if (invs) setInvoices(invs.invoices ?? []);
      }
      if (consRes?.ok) {
        const cons = await consRes.json().catch(() => null);
        if (cons) setConsents(cons.consents ?? []);
      }
      setLabResults(overview.labResults);
      setOverviewVital(overview.latestVital);
    } catch (error) {
      logClientError("Patient portal overview fetch failed", error);
      router.push("/patient-login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchPatientData();
    fetch("/api/patient-portal/feedback/rateable")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRateable(Array.isArray(d) ? d : []))
      .catch((error) => logClientError("Rateable visits failed", error));
  }, [fetchPatientData]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/patient-auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(t("portal_logoutError"));
      }

      toast.success(t("portal_loggedOut"));
      router.push("/patient-login");
      router.refresh();
    } catch (error) {
      logClientError("Patient logout failed", error);
      toast.error(t("portal_logoutError"));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayedVital = latestVital ?? overviewVital;

  const cancelAppointment = async (id: string) => {
    setWorkingId(id);
    try {
      const response = await fetch(`/api/patient-portal/appointments/${id}/cancel`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("portal_cancelError"));
      toast.success(t("portal_cancelSuccess"));
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
      );
    } catch (error) {
      logClientError("Patient cancel appointment failed", error);
      toast.error(error instanceof Error ? error.message : t("portal_cancelError"));
    } finally {
      setWorkingId(null);
    }
  };

  const loadRescheduleSlots = async (appointmentId: string, providerId: string, day: string) => {
    if (!orgSlug || !day) {
      setRescheduleSlots([]);
      return;
    }
    try {
      const query = new URLSearchParams({ date: day, providerId });
      const response = await fetch(`/api/book/${orgSlug}/availability?${query}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("portal_rescheduleError"));
      const match = (payload.providers ?? []).find((p: { id: string }) => p.id === providerId);
      setRescheduleSlots(match?.slots ?? []);
    } catch (error) {
      logClientError("Load reschedule slots failed", error);
      setRescheduleSlots([]);
    }
  };

  const payInvoice = async (invoiceId: string) => {
    setWorkingId(`pay-${invoiceId}`);
    try {
      const response = await fetch("/api/patient-portal/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || t("portal_paymentError"));
      }
      window.location.href = payload.url;
    } catch (error) {
      logClientError("Patient online payment failed", error);
      toast.error(error instanceof Error ? error.message : t("portal_paymentError"));
      setWorkingId(null);
    }
  };

  const signConsent = async (type: string, granted: boolean) => {    setWorkingId(`consent-${type}`);
    try {
      const response = await fetch("/api/patient-portal/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentType: type, isGranted: granted }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("portal_consentError"));
      toast.success(t("portal_consentSaved"));
      setConsents((prev) =>
        prev.map((c) =>
          c.type === type ? { ...c, granted: payload.granted, signedAt: payload.signedAt } : c,
        ),
      );
    } catch (error) {
      logClientError("Patient sign consent failed", error);
      toast.error(error instanceof Error ? error.message : t("portal_consentError"));
    } finally {
      setWorkingId(null);
    }
  };

  const confirmReschedule = async (id: string) => {    if (!rescheduleSlot) return;
    setWorkingId(id);
    try {
      const response = await fetch(`/api/patient-portal/appointments/${id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: rescheduleSlot }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("portal_rescheduleError"));
      toast.success(t("portal_rescheduleSuccess"));
      setReschedulingId(null);
      setRescheduleSlot("");
      fetchPatientData();
    } catch (error) {
      logClientError("Patient reschedule failed", error);
      toast.error(error instanceof Error ? error.message : t("portal_rescheduleError"));
    } finally {
      setWorkingId(null);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const submitRating = async (appointmentId: string) => {
    const rating = stars[appointmentId] ?? 0;
    if (rating < 1) {
      toast.error(t("portal_ratePickStars"));
      return;
    }
    try {
      const response = await fetch("/api/patient-portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          rating,
          comment: comments[appointmentId] || undefined,
        }),
      });
      if (!response.ok) throw new Error("rate failed");
      setRateable((prev) => prev.filter((v) => v.id !== appointmentId));
      toast.success(t("portal_rateThanks"));
    } catch (error) {
      toast.error(t("portal_rateError"));
      logClientError("Rating submit failed", error);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">{t("portal_loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {t("portal_welcome").replace("{name}", patient.firstName)}
            </h1>
            <p className="text-sm text-neutral-500">
              {t("portal_mrnLabel")}: {patient.mrn || t("portal_na")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> {isLoggingOut ? t("portal_loggingOut") : t("portal_logout")}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t("portal_quickActions")}</CardTitle>
              <CardDescription>{t("portal_quickActionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {orgSlug ? (
                <Button variant="outline" className="justify-start" asChild>
                  <Link href={`/book/${orgSlug}`}>
                    <Calendar className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_bookAppointment")}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="justify-start"
                  disabled
                  title={t("portal_comingSoon")}
                >
                  <Calendar className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_bookAppointment")}
                </Button>
              )}
              <Button
                variant="outline"
                className="justify-start"
                disabled
                title={t("portal_comingSoon")}
              >
                <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_viewMedicalRecords")}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled
                title={t("portal_comingSoon")}
              >
                <MessageSquare className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_messageProvider")}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled
                title={t("portal_comingSoon")}
              >
                <Heart className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_viewHealthSummary")}
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t("portal_accountInfo")}</CardTitle>
              <CardDescription>{t("portal_accountInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-neutral-500">{t("portal_name")}</p>
                <p className="font-medium">
                  {patient.firstName} {patient.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">{t("portal_emailLabel")}</p>
                <p className="font-medium">{patient.email || t("portal_na")}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">{t("portal_mrnLabel")}</p>
                <p className="font-medium">{patient.mrn || t("portal_na")}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled
                title={t("portal_comingSoon")}
              >
                {t("portal_updateProfile")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t("portal_liveVitals")}</CardTitle>
                <CardDescription>
                  {t("portal_liveVitalsDesc")}
                </CardDescription>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  vitalsStatus === "live"
                    ? "bg-emerald-100 text-emerald-800"
                    : vitalsStatus === "error"
                      ? "bg-red-100 text-red-800"
                      : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {vitalsStatus === "live"
                  ? t("vitals_live")
                  : vitalsStatus === "error"
                    ? t("vitals_reconnect")
                    : t("vitals_waiting")}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {displayedVital ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    {t("portal_bloodPressure")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {displayedVital.bloodPressureSystolic ?? "--"}/
                    {displayedVital.bloodPressureDiastolic ?? "--"}
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    {t("portal_heartRate")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {displayedVital.heartRate ?? "--"} bpm
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    {t("portal_spo2")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {displayedVital.spO2 ?? "--"}%
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    {t("portal_temperature")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {displayedVital.temperature ?? "--"} C
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-neutral-500">
                {t("portal_noVitals")}
              </div>
            )}

            {displayedVital ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                <Activity className="h-4 w-4" />
                {t("portal_lastUpdated").replace(
                  "{time}",
                  new Date(displayedVital.recordedAt).toLocaleString(),
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card className="mb-6" id="portal-appointments">
          <CardHeader>
            <CardTitle>{t("portal_upcomingAppointments")}</CardTitle>
            <CardDescription>{t("portal_upcomingAppointmentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-neutral-500">{t("portal_loading")}</p>
            ) : appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt) => {
                  const cancellable =
                    (apt.status === "scheduled" || apt.status === "confirmed") &&
                    new Date(apt.startTime).getTime() > Date.now();
                  return (
                    <div
                      key={apt.id}
                      className="border rounded p-3 hover:bg-neutral-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {apt.type || t("portal_generalCheckup")}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {apt.provider || t("portal_drTbd")}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {apt.status}
                        </span>
                      </div>
                      {cancellable && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={workingId === apt.id}
                            onClick={() => cancelAppointment(apt.id)}
                          >
                            {t("portal_cancelAppointment")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={workingId === apt.id}
                            onClick={() => {
                              setReschedulingId(reschedulingId === apt.id ? null : apt.id);
                              setRescheduleSlot("");
                              setRescheduleSlots([]);
                              setRescheduleDate("");
                            }}
                          >
                            {t("portal_reschedule")}
                          </Button>
                          {shouldShowJoinLink({
                            appointmentType: apt.type,
                            telehealthUrl: apt.telehealthUrl,
                            startTime: apt.startTime,
                            status: apt.status,
                          }) && apt.telehealthUrl ? (
                            <a href={apt.telehealthUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm">{t("tele_join")}</Button>
                            </a>
                          ) : null}
                        </div>
                      )}
                      {reschedulingId === apt.id && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <Input
                            type="date"
                            value={rescheduleDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => {
                              setRescheduleDate(e.target.value);
                              setRescheduleSlot("");
                              loadRescheduleSlots(apt.id, apt.providerId, e.target.value);
                            }}
                          />
                          {rescheduleSlots.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {rescheduleSlots.map((s) => (
                                <Button
                                  key={s.start}
                                  type="button"
                                  size="sm"
                                  variant={rescheduleSlot === s.start ? "default" : "outline"}
                                  onClick={() => setRescheduleSlot(s.start)}
                                >
                                  {new Date(s.start).toLocaleTimeString(
                                    lang === "ar" ? "ar-EG" : "en-US",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            disabled={!rescheduleSlot || workingId === apt.id}
                            onClick={() => confirmReschedule(apt.id)}
                          >
                            {t("portal_confirmBooking")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">
                {t("portal_noUpcomingAppointments")}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => scrollToSection("portal-appointments")}
            >
              {t("portal_viewAllAppointments")}
            </Button>
          </CardContent>
        </Card>

        {rateable.length > 0 ? (
          <Card className="mb-6" id="portal-rate">
            <CardHeader>
              <CardTitle>{t("portal_rateTitle")}</CardTitle>
              <CardDescription>{t("portal_rateDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rateable.map((visit) => (
                  <div key={visit.id} className="border rounded p-3">
                    <p className="font-medium">
                      {visit.type} · {visit.provider}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {new Date(visit.startTime).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} stars`}
                          onClick={() => setStars({ ...stars, [visit.id]: n })}
                        >
                          <Star
                            className={`h-6 w-6 ${(stars[visit.id] ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`}
                          />
                        </button>
                      ))}
                    </div>
                    <Input
                      className="mt-2"
                      placeholder={t("portal_ratePlaceholder")}
                      value={comments[visit.id] ?? ""}
                      onChange={(e) => setComments({ ...comments, [visit.id]: e.target.value })}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      onClick={() => submitRating(visit.id)}
                    >
                      {t("portal_rateSubmit")}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Lab Results */}
        <Card id="portal-lab-results">
          <CardHeader>
            <CardTitle>{t("portal_recentLabResults")}</CardTitle>
            <CardDescription>{t("portal_recentLabResultsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-neutral-500">{t("portal_loading")}</p>
            ) : labResults.length > 0 ? (
              <div className="space-y-3">
                {labResults.map((lab) => (
                  <div
                    key={lab.id}
                    className="border rounded p-3 hover:bg-neutral-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{lab.testName}</p>
                        <p className="text-sm text-neutral-500">
                          {lab.resultValue} {lab.unit}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          lab.status === "abnormal"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {lab.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">
                {t("portal_noLabResults")}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => scrollToSection("portal-lab-results")}
            >
              {t("portal_viewAllResults")}
            </Button>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="mb-6" id="portal-documents">
          <CardHeader>
            <CardTitle>{t("portal_documents")}</CardTitle>
            <CardDescription>{t("portal_documentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-neutral-500">{t("portal_loading")}</p>
            ) : documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="border rounded p-3 hover:bg-neutral-50">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-sm text-neutral-500">{doc.type}</p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline shrink-0"
                      >
                        {doc.type}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">{t("portal_noDocuments")}</p>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="mb-6" id="portal-invoices">
          <CardHeader>
            <CardTitle>{t("portal_invoices")}</CardTitle>
            <CardDescription>{t("portal_invoicesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-neutral-500">{t("portal_loading")}</p>
            ) : invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="border rounded p-3 hover:bg-neutral-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-sm text-neutral-500">{inv.status}</p>
                      </div>
                      <div className="text-left rtl:text-right">
                        <p className="font-medium">
                          {t("portal_balance")}: {inv.balance}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {inv.amountPaid}/{inv.totalAmount}
                        </p>
                        {inv.balance > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            disabled={workingId === `pay-${inv.id}`}
                            onClick={() => payInvoice(inv.id)}
                          >
                            {t("portal_payNow")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">{t("portal_noInvoices")}</p>
            )}
          </CardContent>
        </Card>

        {/* Consents */}
        <Card id="portal-consents">
          <CardHeader>
            <CardTitle>{t("portal_consents")}</CardTitle>
            <CardDescription>{t("portal_consentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-neutral-500">{t("portal_loading")}</p>
            ) : (
              <div className="space-y-3">
                {consents.map((c) => (
                  <div key={c.type} className="border rounded p-3">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className="font-medium">{c.type}</p>
                        <p className="text-sm text-neutral-500">
                          {c.granted ? t("portal_consentSigned") : t("portal_consentPending")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === `consent-${c.type}`}
                          onClick={() => signConsent(c.type, true)}
                        >
                          {t("portal_accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={workingId === `consent-${c.type}`}
                          onClick={() => signConsent(c.type, false)}
                        >
                          {t("portal_decline")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
