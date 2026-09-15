"use client";

import * as React from "react";
import { Plus, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { usePermissionState } from "@/hooks/use-permission-state";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

type Coupon = {
  id: string;
  code: string;
  kind: string;
  value: number | string;
  active: boolean;
  expiresAt: string | null;
};

/**
 * G27: coupon management inside /billing (Biller + Owner, billing:write).
 * Makes the previously API-only /api/coupons discoverable; the invoice
 * dialog's coupon-code field reads from these rows.
 */
export function CouponsCard() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const { guardedFetch } = usePermissionState();
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [form, setForm] = React.useState({ code: "", kind: "percent", value: "", expiresAt: "" });

  const load = React.useCallback(() => {
    guardedFetch<{ coupons?: Coupon[] } | Coupon[]>("/api/coupons")
      .then((data) => {
        if (Array.isArray(data)) setCoupons(data);
        else if (data && Array.isArray(data.coupons)) setCoupons(data.coupons ?? []);
      })
      .catch((error) => logClientError("Coupons fetch failed", error));
  }, [guardedFetch]);

  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    const value = Number(form.value);
    if (!form.code.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error(t("coupon_required"));
      return;
    }
    try {
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          kind: form.kind,
          value,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      if (!response.ok) throw new Error("create failed");
      triggerGuidance("catalog_updated", t("common_added"));
      setForm({ code: "", kind: "percent", value: "", expiresAt: "" });
      load();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Coupon create failed", error);
    }
  };

  const toggle = async (coupon: Coupon) => {
    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      });
      if (!response.ok) throw new Error("update failed");
      triggerGuidance("catalog_updated", t("common_updated"));
      load();
    } catch (error) {
      toast.error(t("common_error"));
      logClientError("Coupon toggle failed", error);
    }
  };

  return (
    <Card className="rounded-lg border border-border bg-card shadow-2xs">
      <CardHeader className="p-5 border-b border-border bg-muted-bg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Tag className="h-4 w-4" />
              {t("coupon_title")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("coupon_subtitle")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("coupon_code")}</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="RAMADAN10" className="ltr-on-rtl h-9 text-xs" />
          </div>
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("common_type")}</Label>
            <SearchableSelect
              value={form.kind}
              onValueChange={(v) => setForm({ ...form, kind: v })}
              options={[
                { value: "percent", label: t("coupon_percent") },
                { value: "fixed", label: t("coupon_fixed") },
              ]}
              triggerClassName="h-9 text-xs"
            />
          </div>
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("coupon_value")}</Label>
            <Input type="number" min="0.01" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="ltr-on-rtl h-9 text-xs" />
          </div>
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("coupon_expires")} ({t("common_optional")})</Label>
            <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="h-9 text-xs" />
          </div>
          <div className="flex items-end">
            <Button onClick={create} className="h-9 w-full text-xs font-semibold shadow-2xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />{t("common_add")}
            </Button>
          </div>
        </div>
        {coupons.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("coupon_empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {coupons.map((coupon) => (
              <button
                key={coupon.id}
                type="button"
                onClick={() => void toggle(coupon)}
                title={coupon.active ? t("ds_inactive") : t("ds_active")}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/50"
              >
                <span className="font-mono font-bold">{coupon.code}</span>
                <span className="text-muted-foreground">
                  {coupon.kind === "percent" ? `${coupon.value}%` : `${coupon.value}`}
                </span>
                <Badge variant={coupon.active ? "success" : "default"}>
                  {coupon.active ? t("ds_active") : t("ds_inactive")}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
