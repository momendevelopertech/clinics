"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string | null;
  email: string;
  specialty: string | null;
  licenseNumber: string | null;
  branch: { name: string } | null;
  room: { name: string; number: string | null } | null;
};

export function StaffProfiles({ t }: { t: (key: string) => string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error(t("settings_staffLoadError"));
      const data = (await response.json()) as Staff[];
      if (!cancelled) setStaff(data);
    }

    void load().catch((reason: unknown) => {
      if (!cancelled) {
        setError(reason instanceof Error ? reason.message : t("settings_staffLoadError"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {staff.map((member) => (
        <div key={member.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{member.name ?? member.email}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            <span className="text-xs text-muted-foreground">{member.specialty ?? t("settings_specialtyUnset")}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {member.licenseNumber ?? t("settings_licenseUnset")} · {member.branch?.name ?? t("locations_unassigned")} · {member.room?.name ?? t("locations_unassigned")}
          </p>
        </div>
      ))}
      {!staff.length && !error ? <p className="text-sm text-muted-foreground">{t("settings_noStaff")}</p> : null}
    </div>
  );
}
