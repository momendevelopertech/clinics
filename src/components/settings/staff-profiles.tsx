"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { displayRoleName } from "@/lib/role-labels";

type Staff = {
  id: string;
  name: string | null;
  email: string;
  specialty: string | null;
  licenseNumber: string | null;
  branch: { name: string } | null;
  room: { name: string; number: string | null } | null;
  userRoles: { role: { id: string; name: string } }[];
};
type Role = { id: string; name: string };

export function StaffProfiles({ t }: { t: (key: string) => string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [staffResponse, rolesResponse] = await Promise.all([fetch("/api/staff"), fetch("/api/staff/roles")]);
      if (!staffResponse.ok || !rolesResponse.ok) throw new Error(t("settings_staffLoadError"));
      const data = (await staffResponse.json()) as Staff[];
      const roleData = (await rolesResponse.json()) as Role[];
      if (!cancelled) setStaff(data);
      if (!cancelled) setRoles(roleData);
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

  async function assignRole(userId: string, roleId: string) {
    const response = await fetch("/api/staff/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleId }),
    });
    if (!response.ok) {
      setError(t("settings_staffRoleError"));
      return;
    }
    setStaff((current) => current.map((member) => member.id === userId
      ? { ...member, userRoles: [{ role: { id: roleId, name: roles.find((role) => role.id === roleId)?.name ?? "" } }] }
      : member));
  }

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
            <Select value={member.userRoles[0]?.role.id} onValueChange={(roleId) => void assignRole(member.id, roleId)}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t("settings_selectRole")} /></SelectTrigger>
              <SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{displayRoleName(role.name)}</SelectItem>)}</SelectContent>
            </Select>
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
