"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

interface StaffRow {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  specialty: string | null;
  branch: { id: string; name: string } | null;
  userRoles: Array<{ role: { id: string; name: string } }>;
}

interface ShiftRow {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  note: string | null;
  branch: { id: string; name: string } | null;
}

const WEEKDAY_KEYS = [
  "staff_sun",
  "staff_mon",
  "staff_tue",
  "staff_wed",
  "staff_thu",
  "staff_fri",
  "staff_sat",
];

export default function StaffPage() {
  const { t } = useLocale();
  const [staff, setStaff] = React.useState<StaffRow[]>([]);
  const [roles, setRoles] = React.useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [branchFilter, setBranchFilter] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState("");
  const [shifts, setShifts] = React.useState<ShiftRow[]>([]);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignUser, setAssignUser] = React.useState("");
  const [assignRole, setAssignRole] = React.useState("");
  const [shiftForm, setShiftForm] = React.useState({
    weekday: "1",
    startTime: "09:00",
    endTime: "17:00",
    branchId: "",
    note: "",
  });

  const loadStaff = React.useCallback(async (branch: string) => {
    const url = branch === "all" ? "/api/staff" : `/api/staff?branchId=${branch}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("staff");
    setStaff(await r.json());
    setSelectedId((prev) => prev);
  }, []);

  const loadAll = React.useCallback(async () => {
    try {
      await loadStaff(branchFilter);
      const [rolesRes, branchesRes] = await Promise.all([
        fetch("/api/staff/roles"),
        fetch("/api/branches"),
      ]);
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (branchesRes.ok) setBranches(await branchesRes.json());
    } catch (error) {
      toast.error(t("staff_loadError"));
      logClientError("Staff load failed", error);
    }
  }, [branchFilter, loadStaff, t]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    if (!selectedId) {
      setShifts([]);
      return;
    }
    fetch(`/api/shifts?userId=${selectedId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setShifts(Array.isArray(d) ? d : []))
      .catch((e) => logClientError("Shifts load failed", e));
  }, [selectedId]);

  const handleAssign = async () => {
    try {
      const r = await fetch("/api/staff/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assignUser, roleId: assignRole }),
      });
      if (r.status === 403) {
        toast.error(t("staff_ownerOnly"));
        return;
      }
      if (!r.ok) throw new Error("assign failed");
      toast.success(t("staff_assignedOk"));
      setAssignOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(t("staff_assignError"));
      logClientError("Role assign failed", error);
    }
  };

  const handleAddShift = async () => {
    if (!selectedId) return;
    try {
      const r = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedId,
          weekday: Number(shiftForm.weekday),
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          branchId: shiftForm.branchId || undefined,
          note: shiftForm.note || undefined,
        }),
      });
      if (r.status === 403) {
        toast.error(t("staff_ownerOnly"));
        return;
      }
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "shift failed");
      }
      toast.success(t("staff_shiftOk"));
      setShifts(await (await fetch(`/api/shifts?userId=${selectedId}`)).json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("staff_shiftError"));
      logClientError("Shift create failed", error);
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      const r = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("delete failed");
      setShifts((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      toast.error(t("staff_shiftError"));
      logClientError("Shift delete failed", error);
    }
  };

  const roleNames = (s: StaffRow) => {
    const names = s.userRoles.map((r) => r.role.name);
    if (s.role && !names.includes(s.role)) names.unshift(s.role);
    return names.length > 0 ? names.join(", ") : "—";
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" /> {t("staff_title")}
          </h2>
          <p className="text-sm text-neutral-500">{t("staff_subtitle")}</p>
        </div>
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">{t("staff_assignRole")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("staff_assignRole")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_member")}</Label>
                <Select value={assignUser} onValueChange={setAssignUser}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name ?? s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_role")}</Label>
                <Select value={assignRole} onValueChange={setAssignRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAssign} disabled={!assignUser || !assignRole}>
                  {t("staff_assign")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("staff_directory")}</CardTitle>
          <div className="flex gap-3">
            <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); void loadStaff(v); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("staff_allBranches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t("staff_member")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("staff_role")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("staff_branch")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("staff_specialty")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${selectedId === s.id ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{s.name ?? s.email}</td>
                    <td className="px-4 py-3 text-neutral-600">{roleNames(s)}</td>
                    <td className="px-4 py-3">{s.branch?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{s.specialty ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedId ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("staff_shifts")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {shifts.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("staff_noShifts")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {shifts.map((sh) => (
                  <div key={sh.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <span>
                      {t(WEEKDAY_KEYS[sh.weekday] ?? "staff_mon")} · {sh.startTime}–{sh.endTime}
                      {sh.branch ? ` · ${sh.branch.name}` : ""}
                      {sh.note ? ` · ${sh.note}` : ""}
                    </span>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteShift(sh.id)}>
                      {t("common_delete")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t pt-4">
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_weekday")}</Label>
                <Select value={shiftForm.weekday} onValueChange={(v) => setShiftForm({ ...shiftForm, weekday: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAY_KEYS.map((k, i) => (
                      <SelectItem key={k} value={String(i)}>{t(k)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_from")}</Label>
                <Input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} />
              </div>
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_to")}</Label>
                <Input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} />
              </div>
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_branch")}</Label>
                <Select value={shiftForm.branchId} onValueChange={(v) => setShiftForm({ ...shiftForm, branchId: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddShift}>{t("staff_addShift")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
