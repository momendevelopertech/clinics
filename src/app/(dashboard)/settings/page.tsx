"use client"

import * as React from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useLocale } from "@/components/locale/locale-provider"
import { StaffProfiles } from "@/components/settings/staff-profiles"
import { ProfileAvatarCard } from "@/components/settings/profile-avatar-card"
import { PermissionDenied } from "@/components/ui/permission-denied"
import { usePermissionState } from "@/hooks/use-permission-state"
import { CloudinaryImageUpload } from "@/components/uploads/cloudinary-image-upload"

type Section = "general" | "billing" | "team" | "notifications"

export default function SettingsPage() {
  const { t } = useLocale()
  const [activeSection, setActiveSection] = React.useState<Section>("general")
  const [settings, setSettings] = React.useState({ appointmentDurationMins: 30, currency: "USD", defaultTaxRate: 0, invoicePrefix: "INV-", appointmentReminders: true, newPatientAlerts: true, billingNotifications: true, clinicLogoUrl: "" as string, clinicLogoPublicId: null as string | null })
  const { forbidden, guardedFetch } = usePermissionState()

  React.useEffect(() => {
    guardedFetch<typeof settings>("/api/settings").then((data) => {
      if (data) setSettings(data)
    }).catch(() => toast.error(t("settings_loadError")))
  }, [t, guardedFetch])

  const handleSave = async () => {
    const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) })
    if (!response.ok) {
      if (response.status === 403) {
        toast.error(t("settings_forbidden") ?? "You don't have permission to save settings.")
      } else {
        toast.error(t("settings_saveError"))
      }
      return
    }
    toast.success(t("settings_saved"))
  }

  const navItems: { id: Section; label: string }[] = [
    { id: "general", label: t("settings_general") },
    { id: "billing", label: t("settings_billing") },
    { id: "team", label: t("settings_team") },
    { id: "notifications", label: t("settings_notifications") },
  ]

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full">
      {forbidden ? (
        <PermissionDenied title={t("settings_forbiddenTitle") ?? "You don't have permission"} description={t("settings_forbidden") ?? "Only the clinic owner can manage settings."} />
      ) : (
      <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">{t("settings_title")}</h2>
          <p className="text-sm text-neutral-500">{t("settings_subtitle")}</p>
        </div>
        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-[5px]">
          <Save className="w-4 h-4 mr-2" />
          {t("settings_saveChanges")}
        </Button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
         <div className="w-full md:w-64 border-r bg-neutral-50/50 dark:bg-neutral-950 p-4">
             <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-[5px] text-sm font-medium transition-colors",
                      activeSection === item.id
                        ? "bg-white dark:bg-neutral-800 shadow-sm border text-indigo-600 dark:text-indigo-400"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">{t("settings_clinicInformation")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="clinicName">{t("settings_clinicName")}</Label>
                        <Input id="clinicName" defaultValue="HealthFirst Associates" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="regNumber">{t("settings_registrationNumber")}</Label>
                        <Input id="regNumber" defaultValue="CLI-98234-XYZ" />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="address">{t("settings_address")}</Label>
                        <Input id="address" defaultValue="123 Medical Parkway, Suite 100, Cityville, ST 12345" />
                    </div>
                    <div className="sm:col-span-2">
                      <CloudinaryImageUpload
                        purpose="clinic_logo"
                        label={t("settings_uploadClinicLogo")}
                        currentUrl={settings.clinicLogoUrl || null}
                        onUploaded={async (result) => {
                          setSettings((prev) => ({ ...prev, clinicLogoUrl: result.url, clinicLogoPublicId: result.publicId }))
                          toast.success(t("settings_logoUploaded"))
                        }}
                      />
                      <p className="text-xs text-neutral-500 mt-2">{t("settings_logoHelp")}</p>
                    </div>
                </div>
             </div>

             <ProfileAvatarCard
               title={t("settings_yourAvatar")}
               description={t("settings_yourAvatarHelp")}
               uploadLabel={t("settings_uploadAvatar")}
             />

             <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">{t("settings_appointmentPreferences")}</h3>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="font-medium text-sm">{t("settings_requireConfirmation")}</p>
                        <p className="text-xs text-neutral-500">{t("settings_requireConfirmationHelp")}</p>
                    </div>
                    <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="font-medium text-sm">{t("settings_allowOnlineBooking")}</p>
                        <p className="text-xs text-neutral-500">{t("settings_allowOnlineBookingHelp")}</p>
                    </div>
                    <Checkbox defaultChecked />
                </div>
             </div>
             </>
            )}

            {activeSection === "billing" && (
              <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">{t("settings_billingInvoices")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">{t("settings_currency")}</Label>
                    <Input id="currency" value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value.toUpperCase() })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxRate">{t("settings_defaultTaxRate")}</Label>
                    <Input id="taxRate" type="number" value={settings.defaultTaxRate} onChange={(event) => setSettings({ ...settings, defaultTaxRate: Number(event.target.value) })} />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="invoicePrefix">{t("settings_invoicePrefix")}</Label>
                    <Input id="invoicePrefix" value={settings.invoicePrefix} onChange={(event) => setSettings({ ...settings, invoicePrefix: event.target.value })} />
                  </div>
                </div>
                <p className="text-sm text-neutral-500 mt-4">{t("settings_billingHelp")}</p>
              </div>
            )}

            {activeSection === "team" && (
              <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">{t("settings_teamMembers")}</h3>
                <StaffProfiles t={t} />
              </div>
            )}

            {activeSection === "notifications" && (
              <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">{t("settings_notifications")}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">{t("settings_appointmentReminders")}</p>
                      <p className="text-xs text-neutral-500">{t("settings_appointmentRemindersHelp")}</p>
                    </div>
                    <Checkbox checked={settings.appointmentReminders} onCheckedChange={(checked) => setSettings({ ...settings, appointmentReminders: checked === true })} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">{t("settings_newPatientAlerts")}</p>
                      <p className="text-xs text-neutral-500">{t("settings_newPatientAlertsHelp")}</p>
                    </div>
                    <Checkbox checked={settings.newPatientAlerts} onCheckedChange={(checked) => setSettings({ ...settings, newPatientAlerts: checked === true })} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">{t("settings_billingNotifications")}</p>
                      <p className="text-xs text-neutral-500">{t("settings_billingNotificationsHelp")}</p>
                    </div>
                    <Checkbox checked={settings.billingNotifications} onCheckedChange={(checked) => setSettings({ ...settings, billingNotifications: checked === true })} />
                  </div>
                </div>
              </div>
            )}
         </div>
      </div>
      </>
      )}
    </div>
  )
}
