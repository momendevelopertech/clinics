"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Ban,
  Copy,
  KeyRound,
  Plus,
  Power,
  Trash2,
  Webhook as WebhookIcon,
} from "lucide-react";;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { FeatureNotConfiguredBanner } from "@/components/ui/feature-not-configured-banner";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

type Webhook = {
  id: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  createdAt: string;
  deliveryCount: number;
};

const EVENT_TYPES = [
  "patient.created",
  "patient.updated",
  "observation.created",
  "appointment.created",
] as const;

export default function IntegrationsPageClient() {
  const { t } = useLocale();
  const { forbidden, guardedFetch } = usePermissionState();
  const { get } = useFeatureConfig();
  const [keys, setKeys] = React.useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [keyName, setKeyName] = React.useState("");
  const [freshKey, setFreshKey] = React.useState<string | null>(null);
  const [hookUrl, setHookUrl] = React.useState("");
  const [hookEvents, setHookEvents] = React.useState<string[]>(["patient.created"]);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [keysData, hooksData] = await Promise.all([
        guardedFetch<{ keys: ApiKey[] }>("/api/api-keys"),
        guardedFetch<{ webhooks: Webhook[] }>("/api/webhooks"),
      ]);
      if (keysData) setKeys(keysData.keys ?? []);
      if (hooksData) setWebhooks(hooksData.webhooks ?? []);
    } catch (error) {
      logClientError("Integrations load failed", error);
    } finally {
      setLoading(false);
    }
  }, [guardedFetch]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const fhir = get("fhir");

  async function createKey() {
    try {
      const r = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName, scopes: ["fhir:write"] }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? "create failed");
      setFreshKey(data.apiKey as string);
      setKeyName("");
      toast.success(t("common_success"));
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("API key create failed", error);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm(t("common_confirmAction"))) return;
    try {
      const r = await fetch(`/api/api-keys/${id}/revoke`, { method: "POST" });
      if (!r.ok) throw new Error("revoke failed");
      toast.success(t("common_success"));
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("API key revoke failed", error);
    }
  }

  async function createWebhook() {
    try {
      const r = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: hookUrl, eventTypes: hookEvents }),
      });
      if (!r.ok) throw new Error("create failed");
      toast.success(t("common_success"));
      setHookUrl("");
      setHookEvents(["patient.created"]);
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Webhook create failed", error);
    }
  }

  async function toggleWebhook(hook: Webhook) {
    try {
      const r = await fetch(`/api/webhooks/${hook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !hook.active }),
      });
      if (!r.ok) throw new Error("update failed");
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Webhook toggle failed", error);
    }
  }

  async function deleteWebhook(id: string) {
    if (!window.confirm(t("common_confirmDelete"))) return;
    try {
      const r = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("delete failed");
      toast.success(t("common_success"));
      await loadAll();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Webhook delete failed", error);
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav_integrations")}</h1>
        <PermissionDenied
          title={t("int_forbiddenTitle") ?? "You don't have permission"}
          description={t("int_forbidden") ?? "Only the clinic owner can manage integrations."}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <WebhookIcon className="w-6 h-6" />
          {t("nav_integrations")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("int_subtitle")}</p>
      </div>

      {fhir && !fhir.configured ? (
        <FeatureNotConfiguredBanner feature="fhir" missingEnvVars={fhir.missing} />
      ) : null}

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <KeyRound className="w-5 h-5 text-primary" />
            {t("int_apiKeys")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("int_apiKeysDesc")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder={t("int_keyName")}
              className="w-full sm:max-w-sm h-9"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
            <Button disabled={keyName.trim().length < 2} onClick={() => void createKey()} className="h-9">
              <Plus className="h-4 w-4 mr-1" />{t("common_add")}
            </Button>
          </div>
          {freshKey ? (
            <div className="rounded-lg border border-border bg-muted-bg/50 p-4 text-sm text-foreground">
              <p className="font-medium text-foreground">{t("int_keyOnce")}</p>
              <code className="mt-2 block break-all rounded-md border border-border bg-card p-2 font-mono text-xs text-foreground">
                {freshKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-8"
                onClick={() => {
                  void navigator.clipboard.writeText(freshKey).catch(() => {});
                  toast.success(t("common_success"));
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />{t("int_copy")}
              </Button>
            </div>
          ) : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common_loading")}</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("int_emptyKeys")}</p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted-bg text-muted-foreground font-medium">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("common_name")}</th>
                    <th className="px-4 py-3 text-start">{t("int_colPrefix")}</th>
                    <th className="px-4 py-3 text-start">{t("common_status")}</th>
                    <th className="px-4 py-3 text-start">{t("common_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-muted-bg/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.prefix}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            k.active
                              ? "bg-success-bg text-success-text"
                              : "bg-muted-bg text-muted-foreground",
                          )}
                        >
                          {k.active ? t("int_active") : t("int_revoked")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {k.active ? (
                          <Button variant="ghost" size="sm" className="text-critical-text hover:text-critical-text hover:bg-critical-bg/50 h-8" onClick={() => void revokeKey(k.id)}>
                            <Ban className="h-3.5 w-3.5 mr-1" />{t("int_revoke")}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <WebhookIcon className="w-5 h-5 text-primary" />
            {t("int_webhooks")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("int_webhooksDesc")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>{t("int_hookUrl")}</Label>
              <Input
                type="url"
                placeholder="https://…"
                className="w-full sm:max-w-md h-9"
                value={hookUrl}
                onChange={(e) => setHookUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((e) => (
                <label
                  key={e}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors",
                    hookEvents.includes(e)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted-bg/50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={hookEvents.includes(e)}
                    onChange={() =>
                      setHookEvents((prev) =>
                        prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
                      )
                    }
                  />
                  {e}
                </label>
              ))}
            </div>
            <div>
              <Button disabled={!hookUrl.trim() || hookEvents.length === 0} onClick={() => void createWebhook()} className="h-9">
                <Plus className="h-4 w-4 mr-1" />{t("common_add")}
              </Button>
            </div>
          </div>
          {webhooks.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">{t("int_emptyHooks")}</p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted-bg text-muted-foreground font-medium">
                  <tr>
                    <th className="px-4 py-3 text-start">URL</th>
                    <th className="px-4 py-3 text-start">{t("int_colEvents")}</th>
                    <th className="px-4 py-3 text-start">{t("common_status")}</th>
                    <th className="px-4 py-3 text-start">{t("common_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {webhooks.map((h) => (
                    <tr key={h.id} className="hover:bg-muted-bg/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs max-w-xs truncate text-foreground">{h.url}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.eventTypes.join(", ")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            h.active
                              ? "bg-success-bg text-success-text"
                              : "bg-muted-bg text-muted-foreground",
                          )}
                        >
                          {h.active ? t("int_active") : t("int_paused")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => void toggleWebhook(h)}>
                            <Power className="h-3.5 w-3.5 mr-1" />{h.active ? t("int_pause") : t("int_resume")}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-critical-text hover:text-critical-text hover:bg-critical-bg/50 h-8" onClick={() => void deleteWebhook(h.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />{t("common_delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
