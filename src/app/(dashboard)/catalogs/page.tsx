"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";

type Service = { id: string; code: string; name: string; price: string; active: boolean };
type Clinical = { id: string; system: string; code: string; name: string; category: string; active: boolean };

export default function CatalogsPage() {
  const { t } = useLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [clinical, setClinical] = useState<Clinical[]>([]);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicesPage, setServicesPage] = useState(1);
  const [clinicalPage, setClinicalPage] = useState(1);

  useEffect(() => {
    Promise.all([
      fetch("/api/catalogs?kind=service").then((response) => {
        if (response.status === 403) setForbidden(true);
        return response.json();
      }),
      fetch("/api/catalogs?kind=clinical").then((response) => {
        if (response.status === 403) setForbidden(true);
        return response.json();
      }),
    ])
      .then(([serviceData, clinicalData]) => {
        setServices(Array.isArray(serviceData) ? serviceData : []);
        setClinical(Array.isArray(clinicalData) ? clinicalData : []);
      })
      .catch(() => setError(t("catalogs_loadError")));
  }, [t]);

  if (forbidden) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-2xl font-bold">{t("catalogs_title")}</h1>
        <PermissionDenied
          title={t("catalogs_forbiddenTitle") ?? "You don't have permission"}
          description={t("catalogs_forbidden") ?? "Your role can't view service catalogs."}
        />
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold">{t("catalogs_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("catalogs_subtitle")}</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Input
        type="search"
        placeholder={t("catalogs_search")}
        className="max-w-sm"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setServicesPage(1);
          setClinicalPage(1);
        }}
      />
      <section className="rounded-xl border bg-white p-5 dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-semibold">{t("catalogs_services")}</h2>
        <div className="space-y-2">
          {pagedServices.map((service) => (
            <div key={service.id} className="flex justify-between rounded-lg border p-3 text-sm">
              <span>{service.code} · {service.name}</span><span>{service.price}</span>
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
      <section className="rounded-xl border bg-white p-5 dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-semibold">{t("catalogs_clinical")}</h2>
        <div className="space-y-2">
          {pagedClinical.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3 text-sm">{entry.system} · {entry.code} · {entry.name} ({entry.category})</div>
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
