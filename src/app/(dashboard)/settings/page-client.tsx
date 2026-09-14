"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { StaffProfiles } from "@/components/settings/staff-profiles";
import { IntakeFormsManager } from "@/components/settings/intake-forms-manager";
import { ProfileAvatarCard } from "@/components/settings/profile-avatar-card";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { CloudinaryImageUpload } from "@/components/uploads/cloudinary-image-upload";

type Section = "general" | "billing" | "team" | "notifications" | "intake";

export default function SettingsPageClient() {
  const { t } = useLocale();
  const [activeSection, setActiveSection] = React.useState<Section>("general");
  const [settings, setSettings] = React.useState({
    appointmentDurationMins: 30,
    currency: "USD",
    defaultTaxRate: 0,
    invoicePrefix: "INV-",
    appointmentReminders: true,
    reminderConfig: {
      enabled24h: true,
      enabled1h: true,
      channels: { sms: true, whatsapp: true, email: true },
      quietStart: null as string | null,
      quietEnd: null as string | null,
    },
    newPatientAlerts: true,
    billingNotifications: true,
    clinicLogoUrl: "" as string,
    clinicLogoPublicId: null as string | null,
    cancellationPolicy: { lateCancelHoursBefore: 24, maxNoShows: 3, noShowFee: 0 },
  });

  const updateReminderConfig = (patch: Partial<{ enabled24h: boolean; enabled1h: boolean; channels: { sms: boolean; whatsapp: boolean; email: boolean }; quietStart: string | null; quietEnd: string | null }>) =>
    setSettings((s) => ({ ...s, reminderConfig: { ...s.reminderConfig, ...patch } }));

  const { forbidden, guardedFetch } = usePermissionState();

  React.useEffect(() => {
    guardedFetch<typeof settings>("/api/settings").then((data) => {
      if (data) setSettings(data);
    }).catch(() => toast.error(t("settings_loadError")));
  }, [t, guardedFetch]);

  const handleSave = async () => {
    const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    if (!response.ok) {
      if (response.status === 403) {
        toast.error(t("settings_forbidden") ?? "You don't have permission to save settings.");
      } else {
        toast.error(t("settings_saveError"));
      }
      return;
    }
    toast.success(t("settings_saved"));
  };

  const navItems: { id: Section; label: string }[] = [
    { id: "general", label: t("settings_general") },
    { id: "billing", label: t("settings_billing") },
    { id: "team", label: t("settings_team") },
    { id: "notifications", label: t("settings_notifications") },
    { id: "intake", label: t("intake_title") },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto h-full">
      {forbidden ? (
        <PermissionDenied title={t("settings_forbiddenTitle") ?? "You don't have permission"} description={t("settings_forbidden") ?? "Only the clinic owner can manage settings."} />
      ) : (
      <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("settings_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings_subtitle")}</p>
        </div>
        <Button onClick={handleSave} className="h-9 gap-1.5 shadow-xs">
          <Save className="w-4 h-4" />
          {t("settings_saveChanges")}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[500px]">
         <div className="w-full md:w-64 border-r border-border bg-muted-bg/30 p-4">
             <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "text-start px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      activeSection === item.id
                        ? "bg-card shadow-xs border border-border text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted-bg/60 hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
             </nav>
         </div>
         <div className="p-6 flex-1 flex flex-col gap-6">
            {activeSection === "general" && (
             <>
             <div>
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 text-foreground">{t("settings_clinicInformation")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="clinicName">{t("settings_clinicName")}</Label>
                        <Input id="clinicName" defaultValue="HealthFirst Associates" className="h-9 bg-background" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="regNumber">{t("settings_registrationNumber")}</Label>
                        <Input id="regNumber" defaultValue="CLI-98234-XYZ" className="h-9 bg-background" />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="address">{t("settings_address")}</Label>
                        <Input id="address" defaultValue="123 Medical Parkway, Suite 100, Cityville, ST 12345" className="h-9 bg-background" />
                    </div>
                    <div className="sm:col-span-2">
                      <CloudinaryImageUpload
                        purpose="clinic_logo"
                        label={t("settings_uploadClinicLogo")}
                        currentUrl={settings.clinicLogoUrl || null}
                        onUploaded={async (result) => {
                          setSettings((prev) => ({ ...prev, clinicLogoUrl: result.url, clinicLogoPublicId: result.publicId }));
                          toast.success(t("settings_logoUploaded"));
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-2">{t("settings_logoHelp")}</p>
                    </div>
                </div>
             </div>

             <ProfileAvatarCard
               title={t("settings_yourAvatar")}
               description={t("settings_yourAvatarHelp")}
               uploadLabel={t("settings_uploadAvatar")}
             />

             <div>
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 text-foreground">{t("settings_cancellationPolicy")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="lateCancelHours">{t("settings_lateCancelHours")}</Label>
                        <Input id="lateCancelHours" type="number" min={1} max={168} value={settings.cancellationPolicy.lateCancelHoursBefore} onChange={(event) => setSettings({ ...settings, cancellationPolicy: { ...settings.cancellationPolicy, lateCancelHoursBefore: Number(event.target.value) } })} className="h-9 bg-background" />
                        <p className="text-xs text-muted-foreground">{t("settings_lateCancelHoursHelp")}</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="maxNoShows">{t("settings_maxNoShows")}</Label>
                        <Input id="maxNoShows" type="number" min={1} max={20} value={settings.cancellationPolicy.maxNoShows} onChange={(event) => setSettings({ ...settings, cancellationPolicy: { ...settings.cancellationPolicy, maxNoShows: Number(event.target.value) } })} className="h-9 bg-background" />
                        <p className="text-xs text-muted-foreground">{t("settings_maxNoShowsHelp")}</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="noShowFee">{t("settings_noShowFee")}</Label>
                        <Input id="noShowFee" type="number" min={0} value={settings.cancellationPolicy.noShowFee} onChange={(event) => setSettings({ ...settings, cancellationPolicy: { ...settings.cancellationPolicy, noShowFee: Number(event.target.value) } })} className="h-9 bg-background" />
                        <p className="text-xs text-muted-foreground">{t("settings_noShowFeeHelp")}</p>
                    </div>
                </div>
             </div>

             <div>
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 text-foreground">{t("settings_appointmentPreferences")}</h3>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="font-medium text-sm text-foreground">{t("settings_requireConfirmation")}</p>
                        <p className="text-xs text-muted-foreground">{t("settings_requireConfirmationHelp")}</p>
                    </div>
                    <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="font-medium text-sm text-foreground">{t("settings_allowOnlineBooking")}</p>
                        <p className="text-xs text-muted-foreground">{t("settings_allowOnlineBookingHelp")}</p>
                    </div>
                    <Checkbox defaultChecked />
                </div>
             </div>
             </>
            )}

            {activeSection === "billing" && (
              <div>
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 text-foreground">{t("settings_billingInvoices")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">{t("settings_currency")}</Label>
                    <Input id="currency" value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value.toUpperCase() })} className="h-9 bg-background" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxRate">{t("settings_defaultTaxRate")}</Label>
                    <Input id="taxRate" type="number" value={settings.defaultTaxRate} onChange={(event) => setSettings({ ...settings, defaultTaxRate: Number(event.target.value) })} className="h-9 bg-background" />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="invoicePrefix">{t("settings_invoicePrefix")}</Label>
                    <Input id="invoicePrefix" value={settings.invoicePrefix} onChange={(event) => setSettings({ ...settings, invoicePrefix: event.target.value })} className="h-9 bg-background" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">{t("settings_billingHelp")}</p>
              </div>
            )}

            {activeSection === "team" && (
              <div>
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 text-foreground">{t("settings_teamMembers")}</h3>
                <StaffProfiles t={t} />
              </div>
            )}

            {activeSection === "notifications" && (
              <div>
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 text-foreground">{t("settings_notifications")}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{t("settings_appointmentReminders")}</p>
                      <p className="text-xs text-muted-foreground">{t("settings_appointmentRemindersHelp")}</p>
                    </div>
                    <Checkbox checked={settings.appointmentReminders} onCheckedChange={(checked) => setSettings({ ...settings, appointmentReminders: checked === true })} />
                  </div>
                  {settings.appointmentReminders ? (
                    <div className="ms-4 space-y-3 border-s-2 border-border ps-4">
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <p className="font-medium text-sm text-foreground">{t("settings_reminder24h")}</p>
                          <p className="text-xs text-muted-foreground">{t("settings_reminder24hHelp")}</p>
                        </div>
                        <Checkbox checked={settings.reminderConfig.enabled24h !== false} onCheckedChange={(checked) => updateReminderConfig({ enabled24h: checked === true })} />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <p className="font-medium text-sm text-foreground">{t("settings_reminder1h")}</p>
                          <p className="text-xs text-muted-foreground">{t("settings_reminder1hHelp")}</p>
                        </div>
                        <Checkbox checked={settings.reminderConfig.enabled1h !== false} onCheckedChange={(checked) => updateReminderConfig({ enabled1h: checked === true })} />
                      </div>
                      <div className="py-1">
                        <p className="font-medium text-sm mb-2 text-foreground">{t("settings_reminderChannels")}</p>
                        <div className="flex flex-wrap gap-4">
                          {(
                            [
                              ["sms", t("comm_channel_sms")],
                              ["whatsapp", t("comm_channel_whatsapp")],
                              ["email", t("comm_channel_email")],
                            ] as const
                          ).map(([channel, label]) => (
                            <label key={channel} className="flex items-center gap-2 text-sm text-foreground">
                              <Checkbox
                                checked={settings.reminderConfig.channels?.[channel] !== false}
                                onCheckedChange={(checked) =>
                                  updateReminderConfig({
                                    channels: { ...settings.reminderConfig.channels, [channel]: checked === true } as { sms: boolean; whatsapp: boolean; email: boolean },
                                  })
                                }
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="py-1">
                        <p className="font-medium text-sm mb-2 text-foreground">{t("settings_quietHours")}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            {t("settings_quietStart")}
                            <Input
                              type="time"
                              value={settings.reminderConfig.quietStart ?? ""}
                              onChange={(e) => updateReminderConfig({ quietStart: e.target.value || null })}
                              className="w-auto h-9 bg-background"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            {t("settings_quietEnd")}
                            <Input
                              type="time"
                              value={settings.reminderConfig.quietEnd ?? ""}
                              onChange={(e) => updateReminderConfig({ quietEnd: e.target.value || null })}
                              className="w-auto h-9 bg-background"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{t("settings_newPatientAlerts")}</p>
                      <p className="text-xs text-muted-foreground">{t("settings_newPatientAlertsHelp")}</p>
                    </div>
                    <Checkbox checked={settings.newPatientAlerts} onCheckedChange={(checked) => setSettings({ ...settings, newPatientAlerts: checked === true })} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{t("settings_billingNotifications")}</p>
                      <p className="text-xs text-muted-foreground">{t("settings_billingNotificationsHelp")}</p>
                    </div>
                    <Checkbox checked={settings.billingNotifications} onCheckedChange={(checked) => setSettings({ ...settings, billingNotifications: checked === true })} />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "intake" && (
              <div>
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4 text-foreground">{t("intake_title")}</h3>
                <IntakeFormsManager />
              </div>
            )}
         </div>
      </div>
      </>
      )}
    </div>
  );
}
