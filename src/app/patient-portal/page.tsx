"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Calendar,
  FileText,
  Heart,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { t } = useLocale();
  const [patient, setPatient] = React.useState<PatientData | null>(null);
  const [appointments, setAppointments] = React.useState<Array<{ id: string; type: string; provider: string; status: string }>>([]);
  const [labResults, setLabResults] = React.useState<Array<{ id: string; testName: string; resultValue: string | null; unit: string | null; status: string }>>([]);
  const [overviewVital, setOverviewVital] = React.useState<VitalSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
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
      setAppointments(overview.appointments);
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

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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
              <Button
                variant="outline"
                className="justify-start"
                disabled
                title={t("portal_comingSoon")}
              >
                <Calendar className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t("portal_bookAppointment")}
              </Button>
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
                {appointments.map((apt) => (
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
                  </div>
                ))}
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
      </div>
    </div>
  );
}
