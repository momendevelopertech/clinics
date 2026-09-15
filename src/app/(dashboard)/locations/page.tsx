"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { PageHelpBanner } from "@/components/ui/page-help-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePermissionState } from "@/hooks/use-permission-state";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { parseApiError } from "@/lib/client-errors";
import { logClientError } from "@/lib/client-logger";
import { handleApiError } from "@/lib/api-error-handler";

type Branch = { id: string; name: string; status: string; _count?: { rooms: number } };
type Room = { id: string; name: string; number: string | null; status: string; branch?: { name: string } | null };

export default function LocationsPage() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
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
      setError(handleApiError(reason, t));
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
      toast.success(t("locations_addBranchSuccess") || "Branch added");
      triggerGuidance("branch_added");
      await load();
    } catch (reason) {
      const message = handleApiError(reason, t);
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
      toast.success(t("locations_addRoomSuccess") || "Room added");
      triggerGuidance("room_added");
      await load();
    } catch (reason) {
      const message = handleApiError(reason, t);
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("locations_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("locations_subtitle")}</p>
        </div>
      </div>

      <PageHelpBanner pageKey="locations" />

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
            <Button onClick={addBranch} disabled={saving || !branchName.trim()} className="h-9 text-xs">
              {t("locations_addBranch")}
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {branches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm bg-background"
              >
                <div>
                  <span className="font-medium text-foreground">{b.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({b._count?.rooms ?? 0} {t("locations_rooms")})
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {b.status}
                </span>
              </div>
            ))}
            {branches.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">{t("locations_noBranches")}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <h2 className="text-base font-semibold text-foreground">{t("locations_rooms")}</h2>
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder={t("locations_roomName")}
                className="h-9 flex-1 bg-background"
              />
              <Input
                value={roomNumber}
                onChange={(event) => setRoomNumber(event.target.value)}
                placeholder={t("locations_roomNumber")}
                className="h-9 w-24 bg-background"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={roomBranchId}
                  onValueChange={setRoomBranchId}
                  placeholder={t("locations_selectBranch") ?? "Select branch..."}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                />
              </div>
              <Button onClick={addRoom} disabled={saving || !roomName.trim()} className="h-9 text-xs">
                {t("locations_addRoom")}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {rooms.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm bg-background"
              >
                <div>
                  <span className="font-medium text-foreground">{r.name}</span>
                  {r.number ? <span className="ml-1 text-xs text-muted-foreground">({r.number})</span> : null}
                  {r.branch?.name ? (
                    <span className="ml-2 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {r.branch.name}
                    </span>
                  ) : null}
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {r.status}
                </span>
              </div>
            ))}
            {rooms.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">{t("locations_noRooms")}</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}