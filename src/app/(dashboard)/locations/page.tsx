"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";

type Branch = { id: string; name: string; status: string; _count?: { rooms: number } };
type Room = { id: string; name: string; number: string | null; status: string; branch?: { name: string } | null };

export default function LocationsPage() {
  const { t } = useLocale();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branchName, setBranchName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const [branchResponse, roomResponse] = await Promise.all([fetch("/api/branches"), fetch("/api/rooms")]);
    if (branchResponse.status === 403 || roomResponse.status === 403) {
      setForbidden(true);
      return;
    }
    if (!branchResponse.ok || !roomResponse.ok) throw new Error(t("locations_loadError"));
    setBranches(await branchResponse.json());
    setRooms(await roomResponse.json());
  }, [t]);

  useEffect(() => {
    // Initial API hydration is intentionally performed after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("locations_loadError")));
  }, [load, t]);

  async function addBranch() {
    const response = await fetch("/api/branches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: branchName }) });
    if (!response.ok) return setError(t("locations_saveError"));
    setBranchName("");
    await load();
  }

  async function addRoom() {
    const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: roomName, number: roomNumber || null }) });
    if (!response.ok) return setError(t("locations_saveError"));
    setRoomName("");
    setRoomNumber("");
    await load();
  }

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("locations_title")}</h1>
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
        <h1 className="text-2xl font-bold">{t("locations_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("locations_subtitle")}</p>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("locations_branches")}</h2>
          <div className="mt-4 flex gap-2">
            <input value={branchName} onChange={(event) => setBranchName(event.target.value)} placeholder={t("locations_branchName")} className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" />
            <button onClick={() => void addBranch()} disabled={!branchName.trim()} className="rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">{t("common_add")}</button>
          </div>
          <ul className="mt-4 space-y-2">{branches.map((branch) => <li key={branch.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{branch.name}</span><span className="text-muted-foreground">{branch._count?.rooms ?? 0} {t("locations_rooms")}</span></li>)}</ul>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("locations_rooms")}</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <input value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder={t("locations_roomName")} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder={t("locations_roomNumber")} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <button onClick={() => void addRoom()} disabled={!roomName.trim()} className="rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">{t("common_add")}</button>
          </div>
          <ul className="mt-4 space-y-2">{rooms.map((room) => <li key={room.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{room.name}{room.number ? ` · ${room.number}` : ""}</span><span className="text-muted-foreground">{room.branch?.name ?? t("locations_unassigned")}</span></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
