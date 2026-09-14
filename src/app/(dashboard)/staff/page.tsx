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
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  CalendarPlus,
  Check,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [assigning, setAssigning] = React.useState(false);
  const [addingShift, setAddingShift] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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
    if (assigning) return;
    try {
      setAssigning(true);
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
    } finally {
      setAssigning(false);
    }
  };

  const handleAddShift = async () => {
    if (!selectedId || addingShift) return;
    try {
      setAddingShift(true);
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
    } finally {
      setAddingShift(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!deleteId || deleting) return;
    try {
      setDeleting(true);
      const r = await fetch(`/api/shifts/${deleteId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("delete failed");
      setShifts((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success(t("common_deleted"));
      setDeleteId(null);
    } catch (error) {
      toast.error(t("staff_shiftError"));
      logClientError("Shift delete failed", error);
    } finally {
      setDeleting(false);
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> {t("staff_title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("staff_subtitle")}</p>
        </div>
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-9 gap-1.5"><UserPlus className="h-4 w-4" />{t("staff_assignRole")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("staff_assignRole")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_member")} *</Label>
                <SearchableSelect value={assignUser} onValueChange={setAssignUser} options={staff.map((s) => ({ value: s.id, label: s.name ?? s.email }))} triggerClassName="h-9" />
              </div>
              <div className="gap-2 flex flex-col">
                <Label>{t("staff_role")} *</Label>
                <SearchableSelect value={assignRole} onValueChange={setAssignRole} options={roles.map((r) => ({ value: r.id, label: r.name }))} triggerClassName="h-9" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAssign} disabled={!assignUser || !assignRole || assigning} className="h-9 gap-1.5">
                  <Check className="h-4 w-4" />{t("staff_assign")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-lg border border-border bg-card shadow-xs">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">{t("staff_directory")}</CardTitle>
            <div className="flex gap-3">
              <SearchableSelect value={branchFilter} onValueChange={(v) => { setBranchFilter(v); void loadStaff(v); }} options={[{ value: "all", label: t("staff_allBranches") }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} triggerClassName="w-48 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted-bg/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t("staff_member")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("staff_role")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("staff_branch")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("staff_specialty")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer hover:bg-muted-bg/50 transition-colors ${selectedId === s.id ? "bg-primary/10" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{s.name ?? s.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{roleNames(s)}</td>
                    <td className="px-4 py-3">{s.branch?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.specialty ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedId ? (
        <Card className="rounded-lg border border-border bg-card shadow-xs">
          <CardHeader className="p-5 border-b border-border">
            <CardTitle className="text-base font-semibold text-foreground">{t("staff_shifts")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-5">
            {shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("staff_noShifts")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {shifts.map((sh) => (
                  <div key={sh.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold text-foreground">{t(WEEKDAY_KEYS[sh.weekday] ?? "staff_mon")}</span> · {sh.startTime}–{sh.endTime}
                      {sh.branch ? ` · ${sh.branch.name}` : ""}
                      {sh.note ? ` · ${sh.note}` : ""}
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-critical-text hover:bg-critical-bg/50 hover:text-critical-text" onClick={() => setDeleteId(sh.id)}>
                      <Trash2 className="h-3.5 w-3.5" />{t("common_delete")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-t border-border pt-4">
              <div className="gap-2 flex flex-col">
                <Label className="text-xs">{t("staff_weekday")} *</Label>
                <SearchableSelect value={shiftForm.weekday} onValueChange={(v) => setShiftForm({ ...shiftForm, weekday: v })} options={WEEKDAY_KEYS.map((k, i) => ({ value: String(i), label: t(k) }))} triggerClassName="h-9" />
              </div>
              <div className="gap-2 flex flex-col">
                <Label className="text-xs">{t("staff_from")} *</Label>
                <Input className="h-9 bg-background" type="time" aria-required="true" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} />
              </div>
              <div className="gap-2 flex flex-col">
                <Label className="text-xs">{t("staff_to")} *</Label>
                <Input className="h-9 bg-background" type="time" aria-required="true" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} />
              </div>
              <div className="gap-2 flex flex-col">
                <Label className="text-xs">{t("staff_branch")}</Label>
                <SearchableSelect value={shiftForm.branchId} onValueChange={(v) => setShiftForm({ ...shiftForm, branchId: v })} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="—" triggerClassName="h-9" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddShift} disabled={addingShift} className="h-9 w-full gap-1.5"><CalendarPlus className="h-4 w-4" />{t("staff_addShift")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteId(null) }}
        title={t("common_confirmTitle")}
        description={t("common_confirmDelete")}
        onConfirm={handleDeleteShift}
        destructive
        loading={deleting}
      />
    </div>
  );
}
