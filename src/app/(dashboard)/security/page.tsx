"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

export default function SecurityPage() {
  const { t } = useLocale();
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [qr, setQr] = React.useState("");
  const [code, setCode] = React.useState("");
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    try {
      const r = await fetch("/api/auth/2fa/status");
      if (r.ok) setEnabled((await r.json()).enabled === true);
    } catch (error) {
      logClientError("2FA status failed", error);
    }
  }, []);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    try {
      setBusy(true);
      const r = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!r.ok) throw new Error("setup failed");
      setQr((await r.json()).qrDataUrl as string);
    } catch (error) {
      toast.error(t("sec_error"));
      logClientError("2FA setup failed", error);
    } finally {
      setBusy(false);
    }
  };

  const verifyEnable = async () => {
    try {
      setBusy(true);
      const r = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      if (!r.ok) throw new Error("verify failed");
      const data = await r.json();
      setBackupCodes(data.backupCodes ?? []);
      setEnabled(true);
      setQr("");
      setCode("");
      toast.success(t("sec_enabledOk"));
    } catch (error) {
      toast.error(t("sec_error"));
      logClientError("2FA verify failed", error);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    try {
      setBusy(true);
      const r = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      if (!r.ok) throw new Error("disable failed");
      setEnabled(false);
      setCode("");
      toast.success(t("sec_disabledOk"));
    } catch (error) {
      toast.error(t("sec_error"));
      logClientError("2FA disable failed", error);
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = async () => {
    try {
      setExporting(true);
      const r = await fetch("/api/org/export");
      if (r.status === 403) {
        toast.error(t("sec_exportError"));
        return;
      }
      if (!r.ok) throw new Error("export failed");
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clinic-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(t("sec_exportError"));
      logClientError("Backup export failed", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" /> {t("sec_title")}
        </h2>
        <p className="text-sm text-neutral-500">{t("sec_subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t("sec_2fa")}
            {enabled !== null ? (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${enabled ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800"}`}
              >
                {enabled ? t("sec_enabled") : t("sec_disabled")}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">{t("sec_2faDesc")}</p>

          {enabled === false && !qr ? (
            <div>
              <Button onClick={startSetup} disabled={busy}>
                {t("sec_start")}
              </Button>
            </div>
          ) : null}

          {qr ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">{t("sec_scanHint")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="2FA QR" className="w-48 h-48 rounded border" />
              <div className="grid gap-2 max-w-xs">
                <Label>{t("sec_code")}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </div>
              <div>
                <Button onClick={verifyEnable} disabled={busy || !code.trim()}>
                  {t("sec_verifyEnable")}
                </Button>
              </div>
            </div>
          ) : null}

          {backupCodes.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-sm font-medium mb-2">{t("sec_backupTitle")}</p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </div>
          ) : null}

          {enabled === true ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-500">{t("sec_disableHint")}</p>
              <div className="grid gap-2 max-w-xs">
                <Label>{t("sec_code")}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </div>
              <div>
                <Button variant="destructive" onClick={disable} disabled={busy || !code.trim()}>
                  {t("sec_disable")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sec_export")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">{t("sec_exportDesc")}</p>
          <div>
            <Button variant="outline" onClick={downloadBackup} disabled={exporting}>
              {t("sec_exportBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
