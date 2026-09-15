"use client";
import { Plus } from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { PageHelpBanner } from "@/components/ui/page-help-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePermissionState } from "@/hooks/use-permission-state";
import { parseApiError } from "@/lib/client-errors";
import { logClientError } from "@/lib/client-logger";

type Branch = { id: string; name: string; status: string; _count?: { rooms: number } };
type Room = { id: string; name: string; number: string | null; status: string; branch?: { name: string } | null };

export default function LocationsPage() {
  const { t } = useLocale();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branchName, setBranchName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomBranchId, setRoomBranchId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { forbidden, setForbidden, guardedFetch } = usePermissionState();

  const load = useCallback(async () => {
    const [branchData, roomData] = await Promise.all([
      guardedFetch<Branch[]>("/api/branches"),
      guardedFetch<Room[]>("/api/rooms"),
    ]);
    if (branchData) setBranches(branchData);
    if (roomData) setRooms(roomData);
  }, [guardedFetch]);

  useEffect(() => {
    void load().catch((reason: unknown) => {
      setError(t("locations_loadError"));
      logClientError("Locations load failed", reason);
    });
  }, [load, t]);

  async function addBranch() {
    const name = branchName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/branches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) {
        throw new Error(await parseApiError(response, t("locations_saveError")));
      }
      setBranchName("");
      toast.success(t("locations_addBranchSuccess"));
      await load();
    } catch (reason) {
      const message =
        reason instanceof Error && reason.message ? reason.message : t("locations_saveError");
      setError(message);
      toast.error(message);
      logClientError("Create branch failed", reason);
    } finally {
      setSaving(false);
    }
  }

  async function addRoom() {
    const name = roomName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          number: roomNumber.trim() || null,
          branchId: roomBranchId || null,
        }),
      });
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) {
        throw new Error(await parseApiError(response, t("locations_saveError")));
      }
      setRoomName("");
      setRoomNumber("");
      setRoomBranchId("");
      toast.success(t("locations_addRoomSuccess"));
      await load();
    } catch (reason) {
      const message =
        reason instanceof Error && reason.message ? reason.message : t("locations_saveError");
      setError(message);
      toast.error(message);
      logClientError("Create room failed", reason);
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("locations_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("locations_subtitle")}</p>
        </div>
        <PermissionDenied
          title={t("locations_forbiddenTitle") ?? "You don't have permission"}
          description={t("locations_forbidden") ?? "Your role can't view clinic locations."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("locations_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("locations_subtitle")}</p>
      </div>
      <PageHelpBanner
        title={t("ph_locations_title")}
        description={t("ph_locations_desc")}
        audience={t("ph_locations_audience")}
        actionHint={t("ph_locations_action")}
      />
      {error ? (
        <div className="rounded-md border border-critical/20 bg-critical-bg p-3 text-sm text-critical-text">
          {error}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h2 className="text-base font-semibold text-foreground">{t("locations_branches")}</h2>
          <div className="mt-4 flex gap-2">
            <Input
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
              placeholder={t("locations_branchName")}
              className="h-9 flex-1 bg-background"
              onKeyDown={(event) => {
                if (event.key === "Enter") void addBranch();
              }}
            />
            <Button
              onClick={() => void addBranch()}
              disabled={!branchName.trim() || saving}
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />{t("common_add")}
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {branches.map((branch) => (
              <li key={branch.id} className="flex justify-between items-center rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-muted-bg/50">
                <span className="font-medium">{branch.name}</span>
                <span className="text-xs text-muted-foreground">{branch._count?.rooms ?? 0} {t("locations_rooms")}</span>
              </li>
            ))}
            {!branches.length ? (
              <li className="text-sm text-muted-foreground">{t("locations_empty")}</li>
            ) : null}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h2 className="text-base font-semibold text-foreground">{t("locations_rooms")}</h2>
          <div className="mt-4 flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <Input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder={t("locations_roomName")}
                className="h-9 bg-background"
              />
              <Input
                value={roomNumber}
                onChange={(event) => setRoomNumber(event.target.value)}
                placeholder={t("locations_roomNumber")}
                className="h-9 bg-background"
              />
              <Button
                onClick={() => void addRoom()}
                disabled={!roomName.trim() || saving}
                className="h-9 gap-1.5"
              >
                <Plus className="h-4 w-4" />{t("common_add")}
              </Button>
            </div>
            <SearchableSelect
              value={roomBranchId}
              onValueChange={(value) => setRoomBranchId(value ?? "")}
              options={[
                { value: "", label: t("locations_unassigned") },
                ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
              ]}
              placeholder={t("locations_selectBranch")}
              triggerClassName="h-9 w-full bg-background sm:max-w-xs"
              contentClassName="text-sm"
            />
          </div>
          <ul className="mt-4 space-y-2">
            {rooms.map((room) => (
              <li key={room.id} className="flex justify-between items-center rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-muted-bg/50">
                <span className="font-medium">{room.name}{room.number ? ` · ${room.number}` : ""}</span>
                <span className="text-xs text-muted-foreground">{room.branch?.name ?? t("locations_unassigned")}</span>
              </li>
            ))}
            {!rooms.length ? (
              <li className="text-sm text-muted-foreground">{t("locations_empty")}</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}