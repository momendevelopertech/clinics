"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { logClientError } from "@/lib/client-logger";
import { DataSourceLink } from "@/components/data-source/data-source-navigator";
import { DATA_SOURCES } from "@/components/data-source/sources";

type ClinicalEntry = {
  id: string;
  system: string;
  code: string;
  name: string;
  category: string;
  active: boolean;
};

/**
 * G24: test/diagnosis name picker sourced from the Owner-managed
 * ClinicalCatalog (filtered by system, e.g. "LAB"). Falls back to a free-text
 * input when the catalog has no entries for that system yet.
 */
export function ClinicalCatalogSelect({
  id,
  system,
  value,
  onValueChange,
  placeholder,
  label,
  fallbackHint,
}: {
  id?: string;
  system: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label: React.ReactNode;
  fallbackHint: string;
}) {
  const [entries, setEntries] = React.useState<ClinicalEntry[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/catalogs?kind=clinical")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch clinical catalog");
        return response.json();
      })
      .then((data: unknown) => {
        const list = Array.isArray(data) ? (data as ClinicalEntry[]) : [];
        setEntries(
          list.filter(
            (e) => e.active && e.system.toLowerCase() === system.toLowerCase(),
          ),
        );
        setLoaded(true);
      })
      .catch((error) => {
        logClientError("Clinical catalog lookup failed", error);
        setLoaded(true);
      });
  }, [system]);

  if (loaded && entries.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1 text-sm font-medium">
          {label}
          <DataSourceLink
            href={DATA_SOURCES["clinical-catalog"].href}
            pageRoles={DATA_SOURCES["clinical-catalog"].pageRoles}
            managerLabel={DATA_SOURCES["clinical-catalog"].managerLabel}
          />
        </span>
        <Input id={id} value={value} onChange={(e) => onValueChange(e.target.value)} placeholder={placeholder} />
        <p className="text-[11px] text-warning-text">{fallbackHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-sm font-medium">
        {label}
        <DataSourceLink
          href={DATA_SOURCES["clinical-catalog"].href}
          pageRoles={DATA_SOURCES["clinical-catalog"].pageRoles}
          managerLabel={DATA_SOURCES["clinical-catalog"].managerLabel}
        />
      </span>
      <SearchableSelect
        id={id}
        value={value}
        onValueChange={onValueChange}
        options={entries.map((e) => ({
          value: e.name,
          label: `${e.code} · ${e.name}`,
        }))}
        placeholder={placeholder}
      />
    </div>
  );
}
