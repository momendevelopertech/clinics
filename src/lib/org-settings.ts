export type OrgSettings = {
  appointmentDurationMins?: number;
  openTime?: string;
  closeTime?: string;
  currency?: string;
  defaultTaxRate?: number;
  invoicePrefix?: string;
  appointmentReminders?: boolean;
  reminderConfig?: {
    enabled24h?: boolean;
    enabled1h?: boolean;
    channels?: { sms?: boolean; whatsapp?: boolean; email?: boolean };
    quietStart?: string | null;
    quietEnd?: string | null;
  };
  newPatientAlerts?: boolean;
  billingNotifications?: boolean;
  clinicLogoUrl?: string;
  clinicLogoPublicId?: string | null;
  cancellationPolicy?: {
    lateCancelHoursBefore?: number;
    maxNoShows?: number;
    noShowFee?: number;
  };
};

const DEFAULT_REMINDER_CONFIG = {
  enabled24h: true,
  enabled1h: true,
  channels: { sms: true, whatsapp: true, email: true },
  quietStart: null as string | null,
  quietEnd: null as string | null,
};

export function parseOrgSettings(settingsJson: string | null | undefined): OrgSettings {
  if (!settingsJson) {
    return { appointmentDurationMins: 30, reminderConfig: { ...DEFAULT_REMINDER_CONFIG } };
  }

  try {
    const parsed = JSON.parse(settingsJson) as OrgSettings;
    return {
      appointmentDurationMins: parsed.appointmentDurationMins ?? 30,
      openTime: parsed.openTime,
      closeTime: parsed.closeTime,
      currency: parsed.currency,
      defaultTaxRate: parsed.defaultTaxRate ?? 0,
      invoicePrefix: parsed.invoicePrefix ?? "INV-",
      appointmentReminders: parsed.appointmentReminders ?? true,
      reminderConfig: {
        enabled24h: parsed.reminderConfig?.enabled24h ?? true,
        enabled1h: parsed.reminderConfig?.enabled1h ?? true,
        channels: {
          sms: parsed.reminderConfig?.channels?.sms ?? true,
          whatsapp: parsed.reminderConfig?.channels?.whatsapp ?? true,
          email: parsed.reminderConfig?.channels?.email ?? true,
        },
        quietStart: parsed.reminderConfig?.quietStart ?? DEFAULT_REMINDER_CONFIG.quietStart,
        quietEnd: parsed.reminderConfig?.quietEnd ?? DEFAULT_REMINDER_CONFIG.quietEnd,
      },
      newPatientAlerts: parsed.newPatientAlerts ?? true,
      billingNotifications: parsed.billingNotifications ?? true,
      clinicLogoUrl: parsed.clinicLogoUrl ?? "",
      clinicLogoPublicId: parsed.clinicLogoPublicId ?? null,
      cancellationPolicy: {
        lateCancelHoursBefore: parsed.cancellationPolicy?.lateCancelHoursBefore ?? 24,
        maxNoShows: parsed.cancellationPolicy?.maxNoShows ?? 3,
        noShowFee: parsed.cancellationPolicy?.noShowFee ?? 0,
      },
    };
  } catch {
    return { appointmentDurationMins: 30, reminderConfig: { ...DEFAULT_REMINDER_CONFIG } };
  }
}

export function stringifyOrgSettings(settings: OrgSettings): string {
  return JSON.stringify(settings);
}

export type DoctorAvailability = {
  availabilityType?: string | null;
  availableDays?: string[] | null;
  availableFrom?: string | null;
  availableTo?: string | null;
};

export function parseAvailableDays(raw: string | null | undefined): string[] | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}