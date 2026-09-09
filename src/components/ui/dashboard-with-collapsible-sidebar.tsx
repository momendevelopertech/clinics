"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Activity,
  Bell,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileCheck2,
  FileText,
  FlaskConical,
  HelpCircle,
  Home,
  MessageSquare,
  Microscope,
  Menu,
  Moon,
  Package,
  ScrollText,
  Search,
  Settings,
  Stethoscope,
  Sun,
  User,
  Users,
  Wallet,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMedical } from "@/context/MedicalContext";
import { getLocalNavigationTarget } from "@/lib/redirects";
import { logClientError } from "@/lib/client-logger";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { LanguageSwitcher } from "@/components/locale/language-switcher";
import { displayRoleName } from "@/lib/role-labels";

const routeTitleKeys: Array<[string, string]> = [
  ["/dashboard", "nav_dashboard"],
  ["/patients", "nav_patients"],
  ["/appointments", "nav_appointments"],
  ["/encounters", "nav_encounters"],
  ["/analytics", "nav_analytics"],
  ["/automation", "nav_automation"],
  ["/billing", "nav_billing"],
  ["/payments", "nav_payments"],
  ["/labs", "nav_labs"],
  ["/inventory", "nav_inventory"],
  ["/tasks", "nav_tasks"],
  ["/settings", "nav_settings"],
  ["/help", "nav_help"],
  ["/plan", "nav_plan"],
  ["/reports", "nav_reports"],
  ["/availability", "nav_availability"],
  ["/locations", "nav_locations"],
  ["/documents", "nav_documents"],
  ["/communications", "nav_communications"],
  ["/campaigns", "nav_campaigns"],
  ["/audit", "nav_audit"],
  ["/consents", "nav_consents"],
  ["/waitlist", "nav_waitlist"],
  ["/super", "nav_superAdmin"],
];

interface DashboardWithCollapsibleSidebarProps {
  children: React.ReactNode;
  roles?: string[];
  isSuperAdmin?: boolean;
  orgName?: string;
}

export function DashboardWithCollapsibleSidebar({
  children,
  roles = [],
  isSuperAdmin = false,
  orgName,
}: DashboardWithCollapsibleSidebarProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="app-shell flex min-h-screen w-full text-foreground">
      <CollapsibleSidebar open={open} setOpen={setOpen} roles={roles} isSuperAdmin={isSuperAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader open={open} setOpen={setOpen} orgName={orgName} />
        <main className="flex-1 overflow-auto px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function CollapsibleSidebar({
  open,
  setOpen,
  roles,
  isSuperAdmin,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  roles: string[];
  isSuperAdmin: boolean;
}) {
  const { t } = useLocale();
  const { appointments } = useMedical();

  const today = new Date().toISOString().split("T")[0];
  const todayVisits = appointments.filter(
    (appointment) =>
      appointment.date === today &&
      appointment.status?.toLowerCase() !== "cancelled",
  ).length;

  // Roles that can access a nav item. "Owner" and "Super Admin" can always
  // access every item, so they are not listed per-item.
  type NavRole =
    | "Owner"
    | "Doctor"
    | "Nurse"
    | "Receptionist"
    | "Biller"
    | "Pharmacist"
    | "Care Coordinator";

  const canAccess = (allowed?: NavRole[]) => {
    if (roles.some((role) => role === "Owner" || role === "Super Admin")) {
      return true;
    }
    if (!allowed) return true;
    return roles
      .map(displayRoleName)
      .some((role) => (allowed as string[]).includes(role));
  };

  const navGroups = [
    {
      label: t("nav_overview"),
      items: [
        { icon: Home, label: t("nav_dashboard"), href: "/dashboard" },
        { icon: Users, label: t("nav_patients"), href: "/patients", roles: ["Doctor", "Nurse", "Receptionist", "Biller", "Pharmacist"] as NavRole[] },
        { icon: Calendar, label: t("nav_appointments"), href: "/appointments", roles: ["Doctor", "Nurse", "Receptionist", "Biller", "Pharmacist"] as NavRole[] },
        { icon: CalendarClock, label: t("nav_queue"), href: "/queue", roles: ["Doctor", "Nurse", "Receptionist"] as NavRole[] },
        { icon: ClipboardList, label: t("nav_encounters"), href: "/encounters", roles: ["Doctor", "Nurse"] as NavRole[] },
        { icon: Activity, label: t("nav_analytics"), href: "/analytics", roles: ["Doctor", "Nurse", "Biller"] as NavRole[] },
        { icon: FileCheck2, label: t("nav_consents"), href: "/consents", roles: ["Doctor", "Nurse", "Receptionist"] as NavRole[] },
        { icon: ScrollText, label: t("nav_audit"), href: "/audit", roles: ["Doctor", "Biller"] as NavRole[] },
      ].filter((item) => canAccess(item.roles as NavRole[] | undefined)),
    },
    {
      label: t("nav_operations"),
      items: [
        { icon: DollarSign, label: t("nav_billing"), href: "/billing", roles: ["Biller"] as NavRole[] },
        { icon: Wallet, label: t("nav_payments"), href: "/payments", roles: ["Biller"] as NavRole[] },
        { icon: FlaskConical, label: t("nav_labs"), href: "/labs", roles: ["Doctor", "Nurse", "Pharmacist"] as NavRole[] },
        { icon: Package, label: t("nav_inventory"), href: "/inventory", roles: ["Nurse", "Pharmacist"] as NavRole[] },
        { icon: Stethoscope, label: t("nav_tasks"), href: "/tasks", roles: ["Doctor", "Nurse", "Receptionist", "Biller", "Pharmacist"] as NavRole[] },
        { icon: FileText, label: t("nav_documents"), href: "/documents", roles: ["Doctor", "Nurse", "Receptionist"] as NavRole[] },
        { icon: MessageSquare, label: t("nav_communications"), href: "/communications", roles: ["Receptionist"] as NavRole[] },
      ].filter((item) => canAccess(item.roles as NavRole[] | undefined)),
    },
  ];
  if (isSuperAdmin) {
    // A platform account is not a clinic tenant. Keep clinic navigation out
    // of the shell even though Super Admin has broad RBAC permissions.
    navGroups.length = 0;
  }

  const systemItems = [
    { icon: ClipboardList, label: t("nav_plan"), href: "/plan", roles: ["Owner"] as NavRole[] },
    { icon: Activity, label: t("nav_reports"), href: "/reports", roles: ["Doctor", "Nurse", "Biller"] as NavRole[] },
    { icon: Calendar, label: t("nav_availability"), href: "/availability", roles: ["Doctor", "Nurse"] as NavRole[] },
    { icon: Settings, label: t("nav_locations"), href: "/locations", roles: ["Receptionist"] as NavRole[] },
    { icon: ClipboardList, label: t("nav_catalogs"), href: "/catalogs", roles: ["Doctor", "Nurse", "Pharmacist"] as NavRole[] },
    { icon: Settings, label: t("nav_settings"), href: "/settings", roles: ["Owner"] as NavRole[] },
    { icon: CalendarClock, label: t("nav_waitlist"), href: "/waitlist", roles: ["Receptionist"] as NavRole[] },
    { icon: HelpCircle, label: t("nav_help"), href: "/help" },
  ]
    .filter((item) => canAccess(item.roles as NavRole[] | undefined));

  if (isSuperAdmin) {
    systemItems.length = 0;
    systemItems.push(
      { icon: Building2, label: t("super_navOrganizations"), href: "/super?section=organizations" },
      { icon: Check, label: t("super_navApprovals"), href: "/super?section=approvals" },
      { icon: Wallet, label: t("super_navBilling"), href: "/super?section=billing" },
      { icon: ScrollText, label: t("super_navAudit"), href: "/super?section=audit" },
      { icon: Settings, label: t("super_navSettings"), href: "/super?section=settings" },
    );
  }

  navGroups.push({ label: t("nav_system"), items: systemItems });

  return (
    <aside
      className={cn(
        "surface-panel sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border/80 px-3 py-4 md:flex md:flex-col",
        open ? "w-76" : "w-24",
      )}
    >
      <Link
        href="/dashboard"
        className={cn(
          "hero-glow flex items-center rounded-[28px] border border-white/50 px-3 py-3 transition-colors",
          "bg-white/70 dark:bg-white/5",
        )}
      >
        <div className="grid size-12 place-content-center rounded-[20px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
          <Activity className="h-5 w-5" />
        </div>
        {open ? (
          <div className="ml-3 min-w-0">
            <p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {t("shell_brandEyebrow")}
            </p>
            <p className="truncate text-lg font-semibold text-foreground">
              {t("appName")}
            </p>
          </div>
        ) : null}
      </Link>

      <div className="mt-6 rounded-[28px] border border-white/50 bg-white/55 p-3 text-sm shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
        {open ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("shell_todayVisits")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{todayVisits}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dash_apptsNotCancelled")}
            </p>
          </>
        ) : (
          <div className="flex justify-center py-2">
            <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
              {todayVisits}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 flex-1 space-y-5 overflow-y-auto pb-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {open ? (
              <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} open={open} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="mt-auto h-12 justify-start rounded-[18px] border border-white/55 bg-white/50 px-2.5 hover:bg-white/80 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
      >
        <div className="grid size-8 place-content-center rounded-[12px] bg-primary/10 text-primary">
          <ChevronRight className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
        </div>
        {open ? <span className="ml-2 text-sm font-medium">{t("header_collapse")}</span> : null}
      </Button>
    </aside>
  );
}

function NavLink({
  item,
  open,
}: {
  item: { icon: React.ElementType; label: string; href: string };
  open: boolean;
}) {
  const pathname = usePathname();
  const isSelected =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const { t } = useLocale();

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center rounded-[18px] px-2 py-2.5 transition-all",
        isSelected
          ? "bg-linear-to-r from-primary to-cyan-500 text-primary-foreground shadow-lg shadow-cyan-500/20"
          : "text-muted-foreground hover:bg-white/75 hover:text-foreground dark:hover:bg-white/[0.05]",
      )}
    >
      <div
        className={cn(
          "grid size-10 shrink-0 place-content-center rounded-[14px] transition-colors",
          isSelected
            ? "bg-white/18 text-primary-foreground"
            : "bg-white/70 text-foreground/80 group-hover:bg-white dark:bg-white/[0.04] dark:group-hover:bg-white/[0.08]",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      {open ? (
        <div className="ml-3 min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p
            className={cn(
              "truncate text-xs",
              isSelected ? "text-black/90" : "text-muted-foreground",
            )}
          >
            {item.href === "/dashboard" ? t("appTagline") : t("appSubtitle")}
          </p>
        </div>
      ) : null}
    </Link>
  );
}

function DashboardHeader({
  open,
  setOpen,
  orgName,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  orgName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { patients, appointments } = useMedical();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t } = useLocale();

  const title = useMemo(() => {
    const match = routeTitleKeys.find(([href]) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      return pathname === href || pathname.startsWith(`${href}/`);
    });
    return t(match?.[1] ?? "appSubtitle");
  }, [pathname, t]);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const patientMatches = patients
      .filter((patient) => {
        return [
          patient.firstName,
          patient.lastName,
          patient.mrn,
          patient.phone,
          patient.email,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 4)
      .map((patient) => ({
        id: `patient-${patient.id}`,
        href: `/patients?q=${encodeURIComponent(`${patient.firstName} ${patient.lastName}`)}`,
        title: `${patient.firstName} ${patient.lastName}`,
        subtitle: t("shell_searchPatient").replace("{mrn}", patient.mrn),
        icon: Users,
      }));

    const appointmentMatches = appointments
      .filter((appointment) => {
        return [appointment.patientId, appointment.provider, appointment.type, appointment.date]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 4)
      .map((appointment) => ({
        id: `appointment-${appointment.id}`,
        href: `/appointments?q=${encodeURIComponent(appointment.type)}`,
        title: `${appointment.type} · ${appointment.date}`,
        subtitle: t("shell_searchAppointment").replace("{provider}", appointment.provider),
        icon: Calendar,
      }));

    const workspaceMatches = routeTitleKeys
      .filter(
        ([href, key]) =>
          href !== pathname && t(key).toLowerCase().includes(normalized),
      )
      .slice(0, 4)
      .map(([href, key]) => ({
        id: `route-${href}`,
        href,
        title: t(key),
        subtitle: t("appSubtitle"),
        icon: Home,
      }));

    return [...patientMatches, ...appointmentMatches, ...workspaceMatches].slice(0, 6);
  }, [appointments, pathname, patients, searchQuery, t]);

  const notifications = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const items: Array<{
      id: string;
      title: string;
      description: string;
      href: string;
      icon: React.ElementType;
    }> = [];

    const todaysAppointments = appointments.filter((appointment) => appointment.date === today);
    if (todaysAppointments.length > 0) {
      items.push({
        id: "appointments-today",
        title: `${todaysAppointments.length} ${t("shell_notifAppointmentsToday")}`,
        description: t("shell_notifAppointmentsTodayDesc"),
        href: "/appointments",
        icon: Calendar,
      });
    }

    const confirmedAppointments = appointments.filter(
      (appointment) => appointment.status?.toLowerCase() === "confirmed",
    );
    if (confirmedAppointments.length > 0) {
      items.push({
        id: "confirmed-appointments",
        title: `${confirmedAppointments.length} ${t("shell_notifConfirmedVisits")}`,
        description: t("shell_notifConfirmedVisitsDesc"),
        href: "/appointments",
        icon: Bell,
      });
    }

    if (patients.length > 0) {
      items.push({
        id: "patients-directory",
        title: `${patients.length} ${t("shell_notifPatientsInDir")}`,
        description: t("shell_notifPatientsInDirDesc"),
        href: "/patients",
        icon: Users,
      });
    }

    items.push({
      id: "labs-review",
      title: t("shell_notifLabQueue"),
      description: t("shell_notifLabQueueDesc"),
      href: "/labs",
      icon: Microscope,
    });

    return items.slice(0, 4);
  }, [appointments, patients, t]);

  const unreadNotifications = notifications.length;

  const openSearchResult = (href: string) => {
    setSearchQuery("");
    setIsSearchFocused(false);
    router.push(href);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchResults[0]) {
      openSearchResult(searchResults[0].href);
      return;
    }

    router.push("/patients");
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);

      const result = await signOut({
        callbackUrl: "/login",
        redirect: false,
      });

      router.push(getLocalNavigationTarget(result?.url, "/login"));
      router.refresh();
    } catch (error) {
      logClientError("Staff logout failed", error);
      toast.error(t("common_error"));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="surface-panel flex h-20 items-center justify-between rounded-[30px] border border-white/55 px-4 sm:px-6 dark:border-white/6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(!open)}
            className="rounded-[14px] md:hidden"
            aria-label={t("header_toggleNav")}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t("appSubtitle")}
            </p>
            <h1 className="truncate text-2xl font-semibold text-foreground">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden md:block">
            <FeatureTip tipId="shell-search">
              <form onSubmit={handleSearchSubmit}>
                <label className="flex w-[30rem] items-center gap-3 rounded-[18px] border border-white/55 bg-white/60 px-4 py-2.5 text-sm text-muted-foreground shadow-sm dark:border-white/6 dark:bg-white/[0.03]">
                  <Search className="h-4 w-4" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsSearchFocused(false), 120);
                    }}
                    placeholder={t("header_searchPlaceholder")}
                    className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                    aria-label={t("header_searchPlaceholder")}
                  />
                </label>
              </form>
            </FeatureTip>

            {isSearchFocused && searchResults.length > 0 ? (
              <div className="surface-panel absolute left-0 top-[calc(100%+0.75rem)] z-30 w-full rounded-[24px] border border-white/60 p-2 dark:border-white/6">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openSearchResult(result.href)}
                    className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-white/65 dark:hover:bg-white/[0.05]"
                  >
                    <div className="grid size-10 shrink-0 place-content-center rounded-[14px] bg-primary/10 text-primary">
                      <result.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {result.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-[16px] border border-white/55 bg-white/60 dark:border-white/6 dark:bg-white/[0.03]"
                aria-label={t("header_notifications")}
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-content-center rounded-full border-2 border-background bg-amber-500 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-[18px] p-2">
              <DropdownMenuLabel className="px-3 py-2">{t("header_notifications")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  {t("header_noNotifications")}
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    asChild
                    className="rounded-[14px] px-3 py-3 focus:bg-accent/60"
                  >
                    <Link href={notification.href} className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-content-center rounded-[12px] bg-primary/10 text-primary">
                        <notification.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <LanguageSwitcher compact />

          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-[16px] border border-white/55 bg-white/60 dark:border-white/6 dark:bg-white/[0.03]"
              aria-label={theme === "dark" ? t("shell_themeLight") : t("shell_themeDark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 rounded-[18px] border border-white/55 bg-white/60 px-2 dark:border-white/6 dark:bg-white/[0.03]"
              >
                <div className="grid size-8 place-content-center rounded-[12px] bg-linear-to-br from-primary to-cyan-500 text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-foreground">{t("shell_accountStaff")}</p>
                  <p className="text-xs text-muted-foreground">{orgName ?? t("shell_defaultOrgName")}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-[18px]">
              <DropdownMenuLabel>{t("header_account")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">{t("nav_settings")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help">{t("nav_help")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                disabled={isLoggingOut}
                onSelect={() => {
                  void handleLogout();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? `${t("header_logout")}...` : t("header_logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default DashboardWithCollapsibleSidebar;
