export type OrgSettings = {
  appointmentDurationMins?: number;
  openTime?: string;
  closeTime?: string;
};

export function parseOrgSettings(settingsJson: string | null | undefined): OrgSettings {
  if (!settingsJson) {
    return { appointmentDurationMins: 30 };
  }

  try {
    const parsed = JSON.parse(settingsJson) as OrgSettings;
    return {
      appointmentDurationMins: parsed.appointmentDurationMins ?? 30,
      openTime: parsed.openTime,
      closeTime: parsed.closeTime,
    };
  } catch {
    return { appointmentDurationMins: 30 };
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