"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check,
  Download,
  Power,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";

export default function SecurityPage() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
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
      triggerGuidance("action_completed", t("sec_enabledOk"));
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
      triggerGuidance("action_completed", t("sec_disabledOk"));
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
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> {t("sec_title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t("sec_subtitle")}</p>
      </div>

      <Card className="rounded-lg border border-border bg-card shadow-2xs">
        <CardHeader className="p-5 border-b border-border bg-muted-bg">
          <CardTitle className="flex items-center justify-between text-base font-bold text-foreground">
            <span>{t("sec_2fa")}</span>
            {enabled !== null ? (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  enabled
                    ? "bg-success-bg text-success-text border-success/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {enabled ? t("sec_enabled") : t("sec_disabled")}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-5">
          <p className="text-xs text-muted-foreground leading-relaxed">{t("sec_2faDesc")}</p>

          {enabled === false && !qr ? (
            <div>
              <Button onClick={startSetup} disabled={busy} className="h-9 gap-2 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="h-4 w-4" />
                {t("sec_start")}
              </Button>
            </div>
          ) : null}

          {qr ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-foreground">{t("sec_scanHint")}</p>
              <div className="p-2 border border-border rounded-lg bg-card inline-block w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt={t("security_qrAlt")} className="w-44 h-44 rounded-md" />
              </div>
              <div className="grid gap-1.5 max-w-xs">
                <Label className="text-xs font-semibold">{t("sec_code")}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="h-9 text-center font-mono text-base tracking-widest bg-background"
                />
              </div>
              <div>
                <Button onClick={verifyEnable} disabled={busy || !code.trim()} className="h-9 gap-2 text-xs font-semibold shadow-2xs">
                  <Check className="h-4 w-4" />
                  {t("sec_verifyEnable")}
                </Button>
              </div>
            </div>
          ) : null}

          {backupCodes.length > 0 ? (
            <div className="rounded-lg border border-warning/30 bg-warning-bg p-4">
              <p className="text-xs font-bold text-warning-text mb-2">{t("sec_backupTitle")}</p>
              <div className="grid grid-cols-1 gap-2 font-mono text-xs text-warning-text sm:grid-cols-2">
                {backupCodes.map((c) => (
                  <span key={c} className="p-1.5 bg-card/80 rounded border border-warning/20 text-center">{c}</span>
                ))}
              </div>
            </div>
          ) : null}

          {enabled === true ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">{t("sec_disableHint")}</p>
              <div className="grid gap-1.5 max-w-xs">
                <Label className="text-xs font-semibold">{t("sec_code")}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="h-9 text-center font-mono text-base tracking-widest bg-background"
                />
              </div>
              <div>
                <Button variant="destructive" onClick={disable} disabled={busy || !code.trim()} className="h-9 gap-2 text-xs font-semibold shadow-2xs">
                  <Power className="h-4 w-4" />
                  {t("sec_disable")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-card shadow-2xs">
        <CardHeader className="p-5 border-b border-border bg-muted-bg">
          <CardTitle className="text-base font-bold text-foreground">{t("sec_export")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="text-xs text-muted-foreground leading-relaxed">{t("sec_exportDesc")}</p>
          <div>
            <Button variant="outline" onClick={downloadBackup} disabled={exporting} className="h-9 gap-2 text-xs font-semibold shadow-2xs">
              <Download className="h-4 w-4" />
              {t("sec_exportBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
