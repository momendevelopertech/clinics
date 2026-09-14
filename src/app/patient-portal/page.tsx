"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Calendar,
  CalendarDays,
  Check,
  CreditCard,
  Eye,
  FileText,
  Heart,
  LogOut,
  MessageSquare,
  Pencil,
  Star,
  Video,
  X,
} from "lucide-react";;
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
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog";
import { useVitalsStream } from "@/hooks/use-vitals-stream";
import { logClientError } from "@/lib/client-logger";
import { formatMoney } from "@/lib/format-money";
import { shouldShowJoinLink } from "@/lib/telehealth";
import { PortalIntakeCard } from "@/components/portal/portal-intake-card";
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
  const [preview, setPreview] = React.useState<{ title: string; url: string } | null>(null);
  const [reschedulingId, setReschedulingId] = React.useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleSlots, setRescheduleSlots] = React.useState<Array<{ start: string; end: string }>>([]);
  const [rescheduleSlot, setRescheduleSlot] = React.useState("");
  const [workingId, setWorkingId] = React.useState<string | null>(null);
  const [labResults, setLabResults] = React.useState<Array<{ id: string; testName: string; resultValue: string | null; unit: string | null; status: string }>>([]);
  const [prescriptions, setPrescriptions] = React.useState<Array<{ id: string; medicationName: string; dosage: string | null; frequency: string | null; duration: string | null; instructions: string | null; status: string; prescriber: string | null; createdAt: string; items: Array<{ medicationName: string; dosage: string | null; frequency: string | null; duration: string | null; instructions: string | null }> }>>([]);
  const [visits, setVisits] = React.useState<Array<{ id: string; date: string; provider: string | null; diagnoses: Array<{ code: string; name: string }>; followUps: Array<{ dueDate: string; reason: string; status: string }>; prescriptionsCount: number }>>([]);
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

      // Documents/invoices/consents/prescriptions/visits are best-effort: failure must not log out.
      const [docsRes, invRes, consRes, rxRes, visitsRes] = await Promise.all([
        fetch("/api/patient-portal/documents").catch(() => null),
        fetch("/api/patient-portal/invoices").catch(() => null),
        fetch("/api/patient-portal/consents").catch(() => null),
        fetch("/api/patient-portal/prescriptions").catch(() => null),
        fetch("/api/patient-portal/visits").catch(() => null),
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
      if (rxRes?.ok) {
        const rx = await rxRes.json().catch(() => null);
        if (rx) setPrescriptions(rx.prescriptions ?? []);
      }
      if (visitsRes?.ok) {
        const v = await visitsRes.json().catch(() => null);
        if (v) setVisits(v.visits ?? []);
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
    if (!window.confirm(t("common_confirmAction"))) return;
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

  const invoiceStatusLabel = (status: string) => {
    const key =
      status === "draft"
        ? "billing_statusDraft"
        : status === "sent"
          ? "billing_statusSent"
          : status === "partially_paid"
            ? "billing_statusPartiallyPaid"
            : status === "paid"
              ? "billing_statusPaid"
              : status === "overdue"
                ? "billing_statusOverdue"
                : status === "void"
                  ? "billing_statusVoid"
                  : null;
    if (!key) return status;
    const label = t(key);
    return label === key ? status : label;
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("portal_loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FilePreviewDialog
        open={preview !== null}
        onOpenChange={(next) => {
          if (!next) setPreview(null);
        }}
        title={preview?.title ?? ""}
        url={preview?.url ?? null}
      />
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("portal_welcome").replace("{name}", patient.firstName)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("portal_mrnLabel")}: {patient.mrn || t("portal_na")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 h-9"
          >
            <LogOut className="w-4 h-4" /> {isLoggingOut ? t("portal_loggingOut") : t("portal_logout")}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Quick Actions */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{t("portal_quickActions")}</CardTitle>
              <CardDescription>{t("portal_quickActionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {orgSlug ? (
                <Button variant="outline" className="justify-start h-9" asChild>
                  <Link href={`/book/${orgSlug}`}>
                    <Calendar className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_bookAppointment")}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="justify-start h-9"
                  disabled
                  title={t("portal_comingSoon")}
                >
                  <Calendar className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_bookAppointment")}
                </Button>
              )}
              <Button
                variant="outline"
                className="justify-start h-9"
                onClick={() => scrollToSection("portal-visits")}
              >
                <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_viewMedicalRecords")}
              </Button>
              <Button
                variant="outline"
                className="justify-start h-9"
                disabled
                title={t("portal_comingSoon")}
              >
                <MessageSquare className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_messageProvider")}
              </Button>
              <Button
                variant="outline"
                className="justify-start h-9"
                onClick={() => scrollToSection("portal-vitals")}
              >
                <Heart className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_viewHealthSummary")}
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{t("portal_accountInfo")}</CardTitle>
              <CardDescription>{t("portal_accountInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t("portal_name")}</p>
                <p className="font-medium text-foreground">
                  {patient.firstName} {patient.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("portal_emailLabel")}</p>
                <p className="font-medium text-foreground">{patient.email || t("portal_na")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("portal_mrnLabel")}</p>
                <p className="font-medium text-foreground">{patient.mrn || t("portal_na")}</p>
              </div>
              <Button
                variant="outline"
                className="w-full h-9"
                disabled
                title={t("portal_comingSoon")}
              >
                <Pencil className="h-4 w-4 mr-1" />{t("portal_updateProfile")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card id="portal-vitals" className="mb-6 border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t("portal_liveVitals")}</CardTitle>
                <CardDescription>
                  {t("portal_liveVitalsDesc")}
                </CardDescription>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  vitalsStatus === "live"
                    ? "bg-success-bg text-success-text"
                    : vitalsStatus === "error"
                      ? "bg-critical-bg text-critical-text"
                      : "bg-muted-bg text-muted-foreground"
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
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("portal_bloodPressure")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {displayedVital.bloodPressureSystolic ?? "--"}/
                    {displayedVital.bloodPressureDiastolic ?? "--"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("portal_heartRate")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {displayedVital.heartRate ?? "--"} bpm
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("portal_spo2")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {displayedVital.spO2 ?? "--"}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("portal_temperature")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {displayedVital.temperature ?? "--"} C
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                {t("portal_noVitals")}
              </div>
            )}

            {displayedVital ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
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
        <Card className="mb-6 border-border bg-card shadow-sm" id="portal-appointments">
          <CardHeader>
            <CardTitle>{t("portal_upcomingAppointments")}</CardTitle>
            <CardDescription>{t("portal_upcomingAppointmentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("portal_loading")}</p>
            ) : appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt) => {
                  const cancellable =
                    (apt.status === "scheduled" || apt.status === "confirmed") &&
                    new Date(apt.startTime).getTime() > Date.now();
                  return (
                    <div
                      key={apt.id}
                      className="border border-border rounded-lg p-3 bg-card hover:bg-muted-bg/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">
                            {apt.type || t("portal_generalCheckup")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {apt.provider || t("portal_drTbd")}
                          </p>
                        </div>
                        <span className="text-xs bg-accent-blue-bg text-accent-blue-text px-2.5 py-0.5 rounded-full font-medium">
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
                            className="h-8"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />{t("portal_cancelAppointment")}
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
                            className="h-8"
                          >
                            <CalendarDays className="h-3.5 w-3.5 mr-1" />{t("portal_reschedule")}
                          </Button>
                          {shouldShowJoinLink({
                            appointmentType: apt.type,
                            telehealthUrl: apt.telehealthUrl,
                            startTime: apt.startTime,
                            status: apt.status,
                          }) && apt.telehealthUrl ? (
                            <a href={apt.telehealthUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="h-8"><Video className="h-3.5 w-3.5 mr-1" />{t("tele_join")}</Button>
                            </a>
                          ) : null}
                        </div>
                      )}
                      {reschedulingId === apt.id && (
                        <div className="mt-3 space-y-2 border-t border-border pt-3">
                          <Input
                            type="date"
                            value={rescheduleDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => {
                              setRescheduleDate(e.target.value);
                              setRescheduleSlot("");
                              loadRescheduleSlots(apt.id, apt.providerId, e.target.value);
                            }}
                            className="h-9"
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
                                  className="h-8 text-xs"
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
                            className="h-8"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />{t("portal_confirmBooking")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {t("portal_noUpcomingAppointments")}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full mt-4 h-9"
              onClick={() => scrollToSection("portal-appointments")}
            >
              <Eye className="h-4 w-4 mr-1" />{t("portal_viewAllAppointments")}
            </Button>
          </CardContent>
        </Card>

        {rateable.length > 0 ? (
          <Card className="mb-6 border-border bg-card shadow-sm" id="portal-rate">
            <CardHeader>
              <CardTitle>{t("portal_rateTitle")}</CardTitle>
              <CardDescription>{t("portal_rateDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rateable.map((visit) => (
                  <div key={visit.id} className="border border-border rounded-lg p-3 bg-card">
                    <p className="font-medium text-foreground">
                      {visit.type} · {visit.provider}
                    </p>
                    <p className="text-sm text-muted-foreground">
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
                            className={`h-6 w-6 ${(stars[visit.id] ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                          />
                        </button>
                      ))}
                    </div>
                    <Input
                      className="mt-2 h-9"
                      placeholder={t("portal_ratePlaceholder")}
                      value={comments[visit.id] ?? ""}
                      onChange={(e) => setComments({ ...comments, [visit.id]: e.target.value })}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 h-8"
                      onClick={() => submitRating(visit.id)}
                    >
                      <Star className="h-3.5 w-3.5 mr-1" />{t("portal_rateSubmit")}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Lab Results */}
        <PortalIntakeCard />
        <Card id="portal-lab-results" className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>{t("portal_recentLabResults")}</CardTitle>
            <CardDescription>{t("portal_recentLabResultsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("portal_loading")}</p>
            ) : labResults.length > 0 ? (
              <div className="space-y-3">
                {labResults.map((lab) => (
                  <div
                    key={lab.id}
                    className="border border-border rounded-lg p-3 bg-card hover:bg-muted-bg/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{lab.testName}</p>
                        <p className="text-sm text-muted-foreground">
                          {lab.resultValue} {lab.unit}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          lab.status === "abnormal"
                            ? "bg-critical-bg text-critical-text"
                            : "bg-success-bg text-success-text"
                        }`}
                      >
                        {lab.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {t("portal_noLabResults")}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full mt-4 h-9"
              onClick={() => scrollToSection("portal-lab-results")}
            >
              <Eye className="h-4 w-4 mr-1" />{t("portal_viewAllResults")}
            </Button>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="mb-6 border-border bg-card shadow-sm" id="portal-documents">
          <CardHeader>
            <CardTitle>{t("portal_documents")}</CardTitle>
            <CardDescription>{t("portal_documentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("portal_loading")}</p>
            ) : documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-border rounded-lg p-3 bg-card hover:bg-muted-bg/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreview({ title: doc.name, url: doc.url })}
                        className="text-sm text-primary hover:underline shrink-0"
                      >
                        {t("common_view")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t("portal_noDocuments")}</p>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="mb-6 border-border bg-card shadow-sm" id="portal-invoices">
          <CardHeader>
            <CardTitle>{t("portal_invoices")}</CardTitle>
            <CardDescription>{t("portal_invoicesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("portal_loading")}</p>
            ) : invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="border border-border rounded-lg p-3 bg-card hover:bg-muted-bg/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{inv.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">{invoiceStatusLabel(inv.status)}</p>
                      </div>
                      <div className="text-start rtl:text-end">
                        <p className="font-medium text-foreground">
                          {t("billing_colTotal")}: {formatMoney(inv.totalAmount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("common_paid")}: {formatMoney(inv.amountPaid)}
                        </p>
                        <p className="font-medium text-foreground">
                          {t("portal_balance")}: {formatMoney(inv.balance)}
                        </p>
                        {inv.balance > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 h-8"
                              disabled={workingId === `pay-${inv.id}`}
                              onClick={() => payInvoice(inv.id)}
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />{t("portal_payNow")}
                            </Button>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {t("portal_payRedirectNotice")}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t("portal_noInvoices")}</p>
            )}
          </CardContent>
        </Card>

        {/* Prescriptions (G10) */}
        <Card className="mb-6 border-border bg-card shadow-sm" id="portal-prescriptions">
          <CardHeader>
            <CardTitle>{t("portal_prescriptions")}</CardTitle>
            <CardDescription>{t("portal_prescriptionsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("portal_loading")}</p>
            ) : prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{rx.medicationName}</p>
                        <p className="text-sm text-muted-foreground ltr-on-rtl">
                          {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(" · ")}
                        </p>
                        {rx.instructions ? (
                          <p className="text-sm text-muted-foreground">{rx.instructions}</p>
                        ) : null}
                        {rx.items.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            +{rx.items.length} {t("portal_moreItems")}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-end shrink-0">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-muted-bg text-muted-foreground">
                          {rx.status}
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rx.prescriber ?? ""} · {new Date(rx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t("portal_noPrescriptions")}</p>
            )}
          </CardContent>
        </Card>

        {/* Visit history (G10) */}
        <Card className="mb-6 border-border bg-card shadow-sm" id="portal-visits">
          <CardHeader>
            <CardTitle>{t("portal_visits")}</CardTitle>
            <CardDescription>{t("portal_visitsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("portal_loading")}</p>
            ) : visits.length > 0 ? (
              <div className="space-y-3">
                {visits.map((v) => (
                  <div key={v.id} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {new Date(v.date).toLocaleDateString()}
                          {v.provider ? ` · ${v.provider}` : ""}
                        </p>
                        {v.diagnoses.length > 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {v.diagnoses.map((d) => d.name).join("، ")}
                          </p>
                        ) : null}
                        {v.followUps.filter((f) => f.status !== "completed").map((f, i) => (
                          <p key={i} className="mt-1 text-xs font-medium text-primary">
                            {t("portal_followUpDue")}: {new Date(f.dueDate).toLocaleDateString()} — {f.reason}
                          </p>
                        ))}
                      </div>
                      {v.prescriptionsCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => scrollToSection("portal-prescriptions")}
                          className="text-xs text-primary hover:underline shrink-0"
                        >
                          {t("portal_hasPrescriptions").replace("{n}", String(v.prescriptionsCount))}
                        </button>
                      ) : null}
                    </div>
                    {orgSlug ? (
                      <Button variant="outline" size="sm" className="mt-2 h-8" asChild>
                        <Link href={`/book/${orgSlug}`}>
                          <Calendar className="w-3.5 h-3.5 mr-1" />{t("portal_bookFollowUp")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t("portal_noVisits")}</p>
            )}
          </CardContent>
        </Card>

        {/* Consents */}
        <Card id="portal-consents" className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>{t("portal_consents")}</CardTitle>
            <CardDescription>{t("portal_consentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("portal_loading")}</p>
            ) : (
              <div className="space-y-3">
                {consents.map((c) => (
                  <div key={c.type} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className="font-medium text-foreground">{c.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.granted ? t("portal_consentSigned") : t("portal_consentPending")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === `consent-${c.type}`}
                          onClick={() => signConsent(c.type, true)}
                          className="h-8"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />{t("portal_accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={workingId === `consent-${c.type}`}
                          onClick={() => signConsent(c.type, false)}
                          className="h-8"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />{t("portal_decline")}
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
