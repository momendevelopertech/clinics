"use client";

import { User, Building2, Shield } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { displayRoleName } from "@/lib/role-labels";

interface UserContextHeaderProps {
  roles?: string[];
  orgName?: string;
  userName?: string | null;
  compact?: boolean;
}

export function UserContextHeader({
  roles = [],
  orgName,
  userName,
  compact = false,
}: UserContextHeaderProps) {
  const { t } = useLocale();

  const activeUser = userName || t("shell_accountStaff");
  const activeOrg = orgName || t("shell_defaultOrgName");
  const activeRoles = roles;

  const roleLabel = activeRoles.length > 0
    ? activeRoles.map((r: string) => displayRoleName(r)).join(", ")
    : t("role_staff");

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="grid size-6 place-content-center rounded-full bg-primary text-primary-foreground font-semibold text-[11px]">
          <User className="h-3.5 w-3.5" />
        </div>
        <div className="hidden text-start sm:block">
          <p className="text-xs font-semibold text-foreground leading-none">{activeUser}</p>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{roleLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card shadow-2xs">
      <div className="grid size-9 shrink-0 place-content-center rounded-full bg-primary/10 text-primary font-bold text-xs">
        {activeUser
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div className="min-w-0 flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground truncate">{activeUser}</span>
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            <Shield className="h-3 w-3" />
            {roleLabel}
          </span>
        </div>
        {activeOrg ? (
          <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" />
            {activeOrg}
          </span>
        ) : null}
      </div>
    </div>
  );
}
