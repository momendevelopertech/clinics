"use client";

import * as React from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { useRoles } from "@/context/RoleContext";
import { useLocale } from "@/components/locale/locale-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function canSeePage(roles: string[], pageRoles?: string[]): boolean {
  if (roles.some((r) => r === "Owner" || r === "Super Admin")) return true;
  if (!pageRoles) return true;
  const display = roles.map((r) => (r === "Care Coordinator" ? "Receptionist" : r));
  return pageRoles.some((r) => display.includes(r));
}

/**
 * Data Source Navigator (Phase B): a small ↗ next to any value whose
 * source-of-truth lives on another screen. Opens the managing screen in a
 * new tab when the current user may enter it; otherwise shows a
 * "managed by X" tooltip instead of a dead link. Permission-aware by design.
 */
export function DataSourceLink({
  href,
  pageRoles,
  managerLabel,
  className,
}: {
  href: string;
  /** Roles allowed on the target page (proxy.ts CLINIC_PAGE_ACCESS). Omit = every signed-in role. */
  pageRoles?: string[];
  /** Human label of who manages the source, e.g. "Owner" or "Pharmacy". Shown when the user lacks access. */
  managerLabel: string;
  className?: string;
}) {
  const { roles } = useRoles();
  const { t } = useLocale();
  const allowed = canSeePage(roles, pageRoles);

  if (!allowed) {
    return (
      <span
        title={t("ds_managedBy").replace("{role}", managerLabel)}
        aria-label={t("ds_managedBy").replace("{role}", managerLabel)}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground",
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={t("ds_openSource")}
      aria-label={t("ds_openSource")}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

/** Badge for fields with no management surface yet (G-cases) — never hides the gap. */
export function UnmanagedBadge({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <Badge variant="warning" className={className} title={t("ds_unmanagedHint")}>
      {t("ds_unmanaged")}
    </Badge>
  );
}

/** Inline note for values managed right here or fixed by the system (no link needed). */
export function ManagedHereNote({ label, className }: { label: string; className?: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground",
        className,
      )}
    >
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}
