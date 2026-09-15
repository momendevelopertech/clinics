"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { useRoles } from "@/context/RoleContext";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { PackagesSection } from "@/components/packages/packages-section";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

type Service = { id: string; code: string; name: string; price: string; category?: string | null; active: boolean };
type Clinical = { id: string; system: string; code: string; name: string; category: string; active: boolean };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data;
}

export default function CatalogsPage() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const { roles } = useRoles();
  const isOwner = roles.includes("Owner") || roles.includes("Super Admin");
  const [services, setServices] = useState<Service[]>([]);
  const [clinical, setClinical] = useState<Clinical[]>([]);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicesPage, setServicesPage] = useState(1);
  const [clinicalPage, setClinicalPage] = useState(1);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddClinical, setShowAddClinical] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingClinicalId, setEditingClinicalId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({ code: "", name: "", price: "", category: "" });
  const [clinicalForm, setClinicalForm] = useState({ system: "ICD-10", code: "", name: "", category: "" });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [serviceData, clinicalData] = await Promise.all([
        fetch("/api/catalogs?kind=service").then((response) => {
          if (response.status === 403) setForbidden(true);
          return response.json();
        }),
        fetch("/api/catalogs?kind=clinical").then((response) => {
          if (response.status === 403) setForbidden(true);
          return response.json();
        }),
      ]);
      setServices(Array.isArray(serviceData) ? serviceData : []);
      setClinical(Array.isArray(clinicalData) ? clinicalData : []);
    } catch {
      setError(t("catalogs_loadError"));
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (forbidden) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("catalogs_title")}</h1>
        <PermissionDenied
          title={t("catalogs_forbiddenTitle") ?? "You don't have permission"}
          description={t("catalogs_forbidden") ?? "Your role can't view service catalogs."}
        />
      </div>
    );
  }

  const resetServiceForm = () => {
    setServiceForm({ code: "", name: "", price: "", category: "" });
    setEditingServiceId(null);
    setShowAddService(false);
  };

  const resetClinicalForm = () => {
    setClinicalForm({ system: "ICD-10", code: "", name: "", category: "" });
    setEditingClinicalId(null);
    setShowAddClinical(false);
  };

  const saveService = async () => {
    if (!serviceForm.code.trim() || !serviceForm.name.trim() || serviceForm.price === "") {
      toast.error(t("catalogs_required"));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: serviceForm.code.trim(),
        name: serviceForm.name.trim(),
        price: Number(serviceForm.price),
        category: serviceForm.category.trim() || null,
      };
      if (editingServiceId) {
        await api(`/api/catalogs/${editingServiceId}?kind=service`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        triggerGuidance("catalog_updated", t("common_updated"));
      } else {
        await api("/api/catalogs?kind=service", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        triggerGuidance("catalog_updated", t("common_added"));
      }
      resetServiceForm();
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("catalogs_loadError"));
      logClientError("Save service catalog failed", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!window.confirm(t("common_confirmDelete"))) return;
    try {
      const result = (await api(`/api/catalogs/${id}?kind=service`, { method: "DELETE" })) as { deactivated?: boolean };
      triggerGuidance("catalog_updated", result.deactivated ? t("catalogs_deactivated") : t("common_deleted"));
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("catalogs_loadError"));
      logClientError("Delete service catalog failed", err);
    }
  };

  const saveClinical = async () => {
    if (!clinicalForm.system.trim() || !clinicalForm.code.trim() || !clinicalForm.name.trim() || !clinicalForm.category.trim()) {
      toast.error(t("catalogs_required"));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        system: clinicalForm.system.trim(),
        code: clinicalForm.code.trim(),
        name: clinicalForm.name.trim(),
        category: clinicalForm.category.trim(),
      };
      if (editingClinicalId) {
        await api(`/api/catalogs/${editingClinicalId}?kind=clinical`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        triggerGuidance("catalog_updated", t("common_updated"));
      } else {
        await api("/api/catalogs?kind=clinical", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        triggerGuidance("catalog_updated", t("common_added"));
      }
      resetClinicalForm();
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("catalogs_loadError"));
      logClientError("Save clinical catalog failed", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteClinical = async (id: string) => {
    if (!window.confirm(t("common_confirmDelete"))) return;
    try {
      await api(`/api/catalogs/${id}?kind=clinical`, { method: "DELETE" });
      triggerGuidance("catalog_updated", t("common_deleted"));
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("catalogs_loadError"));
      logClientError("Delete clinical catalog failed", err);
    }
  };

  const startEditService = (service: Service) => {
    setServiceForm({ code: service.code, name: service.name, price: service.price, category: service.category ?? "" });
    setEditingServiceId(service.id);
    setShowAddService(true);
  };

  const startEditClinical = (entry: Clinical) => {
    setClinicalForm({ system: entry.system, code: entry.code, name: entry.name, category: entry.category });
    setEditingClinicalId(entry.id);
    setShowAddClinical(true);
  };

  const query = searchQuery.toLowerCase();
  const filteredServices = services.filter((s) =>
    `${s.code} ${s.name}`.toLowerCase().includes(query));
  const filteredClinical = clinical.filter((c) =>
    `${c.system} ${c.code} ${c.name} ${c.category}`.toLowerCase().includes(query));

  const PAGE_SIZE = 10;
  const servicesPageCount = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const servicesVisiblePage = Math.min(servicesPage, servicesPageCount);
  const clinicalPageCount = Math.max(1, Math.ceil(filteredClinical.length / PAGE_SIZE));
  const clinicalVisiblePage = Math.min(clinicalPage, clinicalPageCount);
  const pagedServices = paginate(filteredServices, servicesVisiblePage, PAGE_SIZE);
  const pagedClinical = paginate(filteredClinical, clinicalVisiblePage, PAGE_SIZE);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("catalogs_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("catalogs_subtitle")}</p>
        {!isOwner ? (
          <p className="mt-1 text-xs text-muted-foreground">{t("catalogs_ownerOnly")}</p>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-md border border-critical/20 bg-critical-bg p-3 text-sm text-critical-text">
          {error}
        </div>
      ) : null}
      <Input
        type="search"
        placeholder={t("catalogs_search")}
        className="max-w-sm h-9 bg-background"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setServicesPage(1);
          setClinicalPage(1);
        }}
      />
      <PackagesSection />
      <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1 text-base font-semibold text-foreground">
            {t("catalogs_services")}
          </h2>
          {isOwner ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                resetServiceForm();
                setShowAddService((v) => !v);
              }}
            >
              {showAddService ? <X className="me-1 h-3.5 w-3.5" /> : <Plus className="me-1 h-3.5 w-3.5" />}
              {t("catalogs_addService")}
            </Button>
          ) : null}
        </div>
        {isOwner && showAddService ? (
          <div className="mb-3 grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">{t("catalogs_code")}</Label>
              <Input value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} className="h-9 text-xs" placeholder="VISIT-SP" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-xs font-semibold">{t("common_name")}</Label>
              <Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">{t("catalogs_price")}</Label>
              <Input type="number" min="0" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} className="ltr-on-rtl h-9 text-xs" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-3">
              <Label className="text-xs font-semibold">{t("catalogs_category")} ({t("common_optional")})</Label>
              <Input value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={resetServiceForm}>{t("common_cancel")}</Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void saveService()}>{t("common_save")}</Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          {pagedServices.map((service) => (
            <div key={service.id} className="flex justify-between items-center gap-2 rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-muted-bg/50">
              <span className="font-medium">{service.code} · {service.name}
                {!service.active ? <Badge variant="warning" className="ms-2">{t("ds_inactive")}</Badge> : null}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{service.price}</span>
                {isOwner ? (
                  <>
                    <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditService(service)} aria-label={t("common_edit")}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => void deleteService(service.id)} aria-label={t("common_delete")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </span>
            </div>
          ))}
          {!services.length ? <p className="text-sm text-muted-foreground">{t("catalogs_empty")}</p> : null}
        </div>
        {filteredServices.length > PAGE_SIZE ? (
          <DataPagination
            page={servicesVisiblePage}
            pageSize={PAGE_SIZE}
            total={filteredServices.length}
            onPageChange={setServicesPage}
          />
        ) : null}
      </section>
      <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1 text-base font-semibold text-foreground">
            {t("catalogs_clinical")}
          </h2>
          {isOwner ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                resetClinicalForm();
                setShowAddClinical((v) => !v);
              }}
            >
              {showAddClinical ? <X className="me-1 h-3.5 w-3.5" /> : <Plus className="me-1 h-3.5 w-3.5" />}
              {t("catalogs_addClinical")}
            </Button>
          ) : null}
        </div>
        {isOwner && showAddClinical ? (
          <div className="mb-3 grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">{t("catalogs_system")}</Label>
              <Input value={clinicalForm.system} onChange={(e) => setClinicalForm({ ...clinicalForm, system: e.target.value })} className="ltr-on-rtl h-9 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">{t("catalogs_code")}</Label>
              <Input value={clinicalForm.code} onChange={(e) => setClinicalForm({ ...clinicalForm, code: e.target.value })} className="ltr-on-rtl h-9 text-xs" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-xs font-semibold">{t("common_name")}</Label>
              <Input value={clinicalForm.name} onChange={(e) => setClinicalForm({ ...clinicalForm, name: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-3">
              <Label className="text-xs font-semibold">{t("catalogs_category")}</Label>
              <Input value={clinicalForm.category} onChange={(e) => setClinicalForm({ ...clinicalForm, category: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={resetClinicalForm}>{t("common_cancel")}</Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void saveClinical()}>{t("common_save")}</Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          {pagedClinical.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-muted-bg/50">
              <div>
                <span className="font-mono text-xs text-primary me-2">{entry.system} · {entry.code}</span>
                <span className="font-medium">{entry.name}</span>
                <span className="text-xs text-muted-foreground ms-2">({entry.category})</span>
                {!entry.active ? <Badge variant="warning" className="ms-2">{t("ds_inactive")}</Badge> : null}
              </div>
              {isOwner ? (
                <span className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditClinical(entry)} aria-label={t("common_edit")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => void deleteClinical(entry.id)} aria-label={t("common_delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              ) : null}
            </div>
          ))}
          {!clinical.length ? <p className="text-sm text-muted-foreground">{t("catalogs_empty")}</p> : null}
        </div>
        {filteredClinical.length > PAGE_SIZE ? (
          <DataPagination
            page={clinicalVisiblePage}
            pageSize={PAGE_SIZE}
            total={filteredClinical.length}
            onPageChange={setClinicalPage}
          />
        ) : null}
      </section>
    </div>
  );
}
