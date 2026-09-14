"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Activity,
  Bell,
  BookOpen,
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
  Pill,
  Plug,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
  User,
  Users,
  Wallet,
  Webhook,
  Wrench,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import { Lock } from "lucide-react";
import { PendingChangesButton } from "@/components/pwa/pending-changes";
import { clearAllPwaData } from "@/lib/pwa/cache-clear";
import { PushNotificationToggle } from "@/components/pwa/push-notification-toggle";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import type { ConfigGatedFeature } from "@/lib/feature-config";

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
  ["/queue", "nav_queue"],
  ["/catalogs", "nav_catalogs"],
  ["/audit", "nav_audit"],
  ["/security", "nav_security"],
  ["/staff", "nav_staff"],
  ["/roles-guide", "nav_rolesGuide"],
  ["/consents", "nav_consents"],
  ["/prescriptions", "nav_prescriptions"],
  ["/insurance", "nav_insurance"],
  ["/equipment", "nav_equipment"],
  ["/integrations", "nav_integrations"],
  ["/waitlist", "nav_waitlist"],
  ["/super", "nav_superAdmin"],
];

interface DashboardWithCollapsibleSidebarProps {
  children: React.ReactNode;
  roles?: string[];
  isSuperAdmin?: boolean;
  orgName?: string;
  planModules?: Record<string, boolean> | null;
}

export function DashboardWithCollapsibleSidebar({
  children,
  roles = [],
  isSuperAdmin = false,
  orgName,
  planModules = null,
}: DashboardWithCollapsibleSidebarProps) {
  const [open, setOpen] = useState(true);
  // Mobile drawer state is intentionally separate: it starts closed so the
  // drawer never pops open on first load, independent of desktop collapse.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell flex min-h-screen w-full text-foreground">
      <CollapsibleSidebar
        open={open}
        setOpen={setOpen}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
        roles={roles}
        isSuperAdmin={isSuperAdmin}
        planModules={planModules}
        orgName={orgName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onMenuClick={() => setMobileNavOpen(true)} orgName={orgName} />
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
  mobileNavOpen,
  setMobileNavOpen,
  roles,
  isSuperAdmin,
  planModules,
  orgName,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
  roles: string[];
  isSuperAdmin: boolean;
  planModules?: Record<string, boolean> | null;
  orgName?: string;
}) {
  const { t } = useLocale();
  const { appointments } = useMedical();
  const { get } = useFeatureConfig();

  const isLocked = (moduleKey?: string) =>
    !!moduleKey && !!planModules && planModules[moduleKey] !== true;

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

  type NavItem = {
    icon: React.ElementType;
    label: string;
    href: string;
    roles?: NavRole[];
    moduleKey?: string;
    locked?: boolean;
    /** Env-dependent feature shown as "not configured" badge (page stays visible). */
    configFeature?: ConfigGatedFeature;
    notConfigured?: boolean;
  };

  const canAccess = (allowed?: NavRole[]) => {
    if (roles.some((role) => role === "Owner" || role === "Super Admin")) {
      return true;
    }
    if (!allowed) return true;
    return roles
      .map(displayRoleName)
      .some((role) => (allowed as string[]).includes(role));
  };

  const wrap = (item: NavItem): NavItem => ({
    ...item,
    locked: item.moduleKey ? isLocked(item.moduleKey) : false,
    notConfigured: item.configFeature
      ? get(item.configFeature)?.configured === false
      : false,
  });

  const navGroups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: t("nav_overview"),
      items: [
        { icon: Home, label: t("nav_dashboard"), href: "/dashboard" } as NavItem,
        { icon: Users, label: t("nav_patients"), href: "/patients", roles: ["Doctor", "Nurse", "Receptionist", "Biller", "Pharmacist"] as NavRole[], moduleKey: "patients", locked: false },
        { icon: Calendar, label: t("nav_appointments"), href: "/appointments", roles: ["Doctor", "Nurse", "Receptionist", "Biller", "Pharmacist"] as NavRole[], moduleKey: "appointments", locked: false },
        { icon: CalendarClock, label: t("nav_queue"), href: "/queue", roles: ["Doctor", "Nurse", "Receptionist"] as NavRole[], moduleKey: "queue", locked: false },
        { icon: ClipboardList, label: t("nav_encounters"), href: "/encounters", roles: ["Doctor", "Nurse"] as NavRole[], moduleKey: "encounters", locked: false },
        { icon: Activity, label: t("nav_analytics"), href: "/analytics", roles: ["Doctor", "Nurse", "Biller"] as NavRole[], moduleKey: "analytics", locked: false },
        { icon: FileCheck2, label: t("nav_consents"), href: "/consents", roles: ["Doctor", "Nurse", "Receptionist"] as NavRole[], moduleKey: "consents", locked: false },
        { icon: ScrollText, label: t("nav_audit"), href: "/audit", roles: ["Doctor", "Biller"] as NavRole[], moduleKey: "audit", locked: false },
        { icon: Pill, label: t("nav_prescriptions"), href: "/prescriptions", roles: ["Doctor", "Nurse", "Pharmacist"] as NavRole[], moduleKey: "labs", locked: false },
      ].filter((item) => canAccess(item.roles as NavRole[] | undefined)).map((item: NavItem) => wrap(item)),
    },
    {
      label: t("nav_operations"),
      items: [
        { icon: DollarSign, label: t("nav_billing"), href: "/billing", roles: ["Biller"] as NavRole[], moduleKey: "billing", locked: false },
        { icon: Wallet, label: t("nav_payments"), href: "/payments", roles: ["Biller"] as NavRole[], moduleKey: "payments", locked: false, configFeature: "stripe" as ConfigGatedFeature },
        { icon: ShieldCheck, label: t("nav_insurance"), href: "/insurance", roles: ["Biller"] as NavRole[], moduleKey: "billing", locked: false } as NavItem,
        { icon: FlaskConical, label: t("nav_labs"), href: "/labs", roles: ["Doctor", "Nurse", "Pharmacist"] as NavRole[], moduleKey: "labs", locked: false },
        { icon: Package, label: t("nav_inventory"), href: "/inventory", roles: ["Nurse", "Pharmacist"] as NavRole[], moduleKey: "inventory", locked: false },
        { icon: Wrench, label: t("nav_equipment"), href: "/equipment", roles: ["Nurse", "Pharmacist"] as NavRole[], moduleKey: "inventory", locked: false } as NavItem,
        { icon: Stethoscope, label: t("nav_tasks"), href: "/tasks", roles: ["Doctor", "Nurse", "Receptionist", "Biller", "Pharmacist"] as NavRole[], moduleKey: "tasks", locked: false },
        { icon: FileText, label: t("nav_documents"), href: "/documents", roles: ["Doctor", "Nurse", "Receptionist"] as NavRole[], moduleKey: "documents", locked: false, configFeature: "cloudinary" as ConfigGatedFeature },
        { icon: MessageSquare, label: t("nav_communications"), href: "/communications", roles: ["Receptionist"] as NavRole[], moduleKey: "communications", locked: false, configFeature: "twilio" as ConfigGatedFeature },
        { icon: MessageSquare, label: t("nav_campaigns"), href: "/campaigns", roles: ["Receptionist"] as NavRole[], moduleKey: "communications", locked: false, configFeature: "twilio" as ConfigGatedFeature },
        { icon: Activity, label: t("nav_automation"), href: "/automation", roles: ["Doctor", "Nurse"] as NavRole[], moduleKey: "analytics", locked: false },
      ].filter((item) => canAccess(item.roles as NavRole[] | undefined)).map((item: NavItem) => wrap(item)),
    },
  ];
  if (isSuperAdmin) {
    // A platform account is not a clinic tenant. Keep clinic navigation out
    // of the shell even though Super Admin has broad RBAC permissions.
    navGroups.length = 0;
  }

  const systemItems: NavItem[] = [
    { icon: ClipboardList, label: t("nav_plan"), href: "/plan", roles: ["Owner"] as NavRole[] },
    { icon: Activity, label: t("nav_reports"), href: "/reports", roles: ["Doctor", "Nurse", "Biller"] as NavRole[], configFeature: "email" as ConfigGatedFeature },
    { icon: Calendar, label: t("nav_availability"), href: "/availability", roles: ["Doctor", "Nurse"] as NavRole[] },
    { icon: Settings, label: t("nav_locations"), href: "/locations", roles: ["Receptionist"] as NavRole[] },
    { icon: ClipboardList, label: t("nav_catalogs"), href: "/catalogs", roles: ["Doctor", "Nurse", "Pharmacist"] as NavRole[] },
    { icon: Settings, label: t("nav_settings"), href: "/settings", roles: ["Owner"] as NavRole[] },
    { icon: Webhook, label: t("nav_integrations"), href: "/integrations", roles: ["Owner"] as NavRole[] } as NavItem,
    { icon: CalendarClock, label: t("nav_waitlist"), href: "/waitlist", roles: ["Receptionist"] as NavRole[] },
    { icon: ShieldCheck, label: t("nav_security"), href: "/security" },
    { icon: Users, label: t("nav_staff"), href: "/staff", roles: ["Owner"] as NavRole[] },
    { icon: BookOpen, label: t("nav_rolesGuide"), href: "/roles-guide", roles: ["Owner"] as NavRole[] },
    { icon: HelpCircle, label: t("nav_help"), href: "/help" },
  ]
    .filter((item) => canAccess(item.roles as NavRole[] | undefined))
    .map((item: NavItem) => wrap(item));

  if (isSuperAdmin) {
    systemItems.length = 0;
    systemItems.push(
      { icon: Building2, label: t("super_navOrganizations"), href: "/super?section=organizations" },
      { icon: Lock, label: t("super_navPlans"), href: "/super/plans" },
      { icon: Check, label: t("super_navApprovals"), href: "/super?section=approvals" },
      { icon: Wallet, label: t("super_navBilling"), href: "/super?section=billing" },
      { icon: ScrollText, label: t("super_navAudit"), href: "/super?section=audit" },
      { icon: Plug, label: t("super_navServices"), href: "/super?section=services" },
      { icon: BookOpen, label: t("nav_rolesGuide"), href: "/roles-guide" },
      { icon: Settings, label: t("super_navSettings"), href: "/super?section=settings" },
    );
  }

  navGroups.push({ label: t("nav_system"), items: systemItems });

  return (
    <>
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex-col justify-between overflow-y-auto md:flex transition-all duration-200 z-30",
        open ? "w-70" : "w-20",
      )}
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Logo & Identity */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-sidebar">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="grid size-9 shrink-0 place-content-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            {open ? (
              <div className="min-w-0 flex flex-col">
                <span className="font-semibold text-base text-foreground leading-none">
                  {t("appName")}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight mt-1">
                  {t("shell_brandEyebrow")}
                </span>
              </div>
            ) : null}
          </Link>
          {open ? (
            <span className="font-mono text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-[4px] font-medium">
              v4.2
            </span>
          ) : null}
        </div>

        {/* Branch / Daily Visits Pill */}
        <div className="p-3 border-b border-border bg-muted-bg">
          {open ? (
            <div className="p-2.5 rounded-md border border-border bg-card flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="grid size-7 shrink-0 place-content-center rounded-sm bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {orgName ?? t("shell_defaultOrgName")}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    {t("shell_todayVisits")}: {todayVisits}
                  </span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-success-text shrink-0" title="Connected" />
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary" title={`${t("shell_todayVisits")}: ${todayVisits}`}>
                {todayVisits}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              {open ? (
                <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} open={open} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Telemetry Footer & Collapse Button */}
      <div className="border-t border-border p-3 bg-muted-bg space-y-2">
        {open ? (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-text animate-pulse" />
              <span>{t("shell_serverOnline")}</span>
            </div>
            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded-sm">RT-24ms</span>
          </div>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
          aria-label={t("header_collapse")}
          title={t("header_collapse")}
          className="w-full h-8 justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
          {open ? <span className="ml-1.5 text-xs font-medium">{t("header_collapse")}</span> : null}
        </Button>
      </div>
    </aside>
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="overflow-y-auto p-0 md:hidden bg-sidebar text-sidebar-foreground w-72">
        <div className="h-16 px-4 flex items-center gap-3 border-b border-border bg-sidebar">
          <div className="grid size-9 shrink-0 place-content-center rounded-md bg-primary text-primary-foreground shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="font-semibold text-base text-foreground leading-none">
              {t("appName")}
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight mt-1">
              {t("shell_brandEyebrow")}
            </span>
          </div>
        </div>
        <nav className="p-3 space-y-4" onClick={() => setMobileNavOpen(false)}>
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} open />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
    </>
  );
}

function NavLink({
  item,
  open,
}: {
  item: { icon: React.ElementType; label: string; href: string; locked?: boolean; notConfigured?: boolean };
  open: boolean;
}) {
  const pathname = usePathname();
  const isSelected =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const { t } = useLocale();
  const locked = Boolean(item.locked);
  const notConfigured = Boolean(item.notConfigured) && !locked;

  return (
    <Link
      href={locked ? `/plan?lock=${encodeURIComponent(item.href.replace("/", ""))}` : item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        locked
          ? "text-warning-text hover:bg-warning-bg"
          : isSelected
            ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary rtl:border-r-0 rtl:border-l-2"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <div
        className={cn(
          "grid size-7 shrink-0 place-content-center rounded-sm transition-colors",
          locked
            ? "bg-warning-bg text-warning-text"
            : isSelected
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4", locked && "opacity-80")} />
      </div>
      {open ? (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
          <span className="truncate text-xs font-medium">
            {item.label}
          </span>
          {locked ? (
            <span className="shrink-0 rounded-sm bg-warning-bg border border-warning/30 px-1.5 py-0.5 text-[10px] font-medium text-warning-text">
              <Lock className="h-3 w-3 inline" />
            </span>
          ) : notConfigured ? (
            <span
              title={t("cfg_badge")}
              className="shrink-0 rounded-sm bg-warning-bg border border-warning/30 px-1.5 py-0.5 text-[10px] font-semibold text-warning-text"
            >
              {t("cfg_badge")}
            </span>
          ) : null}
        </div>
      ) : locked ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-warning-text">
          <Lock className="h-3 w-3" />
        </span>
      ) : notConfigured ? (
        <span
          title={t("cfg_badge")}
          className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-warning-text"
        />
      ) : null}
    </Link>
  );
}

function DashboardHeader({
  onMenuClick,
  orgName,
}: {
  onMenuClick: () => void;
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

      await clearAllPwaData();

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
    <header className="sticky top-0 z-20 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuClick}
            className="h-9 w-9 rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label={t("header_toggleNav")}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("appSubtitle")}
            </p>
            <h1 className="truncate text-lg sm:text-xl font-bold text-foreground leading-tight">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <PendingChangesButton />
          <div className="relative hidden md:block">
            <FeatureTip tipId="shell-search">
              <form onSubmit={handleSearchSubmit}>
                <label className="flex w-[20rem] lg:w-[26rem] items-center gap-2.5 rounded-md border border-border bg-muted-bg px-3 py-2 text-xs text-muted-foreground focus-within:border-primary focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-2xs">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsSearchFocused(false), 120);
                    }}
                    placeholder={t("header_searchPlaceholder")}
                    className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                    aria-label={t("header_searchPlaceholder")}
                  />
                </label>
              </form>
            </FeatureTip>

            {isSearchFocused && searchResults.length > 0 ? (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full rounded-lg border border-border bg-popover p-1.5 shadow-lg">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openSearchResult(result.href)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <div className="grid size-8 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
                      <result.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {result.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
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
                className="relative h-9 w-9 rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("header_notifications")}
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -top-1 -right-1 grid min-h-4 min-w-4 place-content-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-2xs">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-lg">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold">{t("header_notifications")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  {t("header_noNotifications")}
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    asChild
                    className="rounded-md px-2.5 py-2 focus:bg-muted cursor-pointer"
                  >
                    <Link href={notification.href} className="flex items-start gap-2.5">
                      <div className="grid size-8 shrink-0 place-content-center rounded-md bg-primary/10 text-primary mt-0.5">
                        <notification.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
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

          <PushNotificationToggle />

          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={theme === "dark" ? t("shell_themeLight") : t("shell_themeDark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 rounded-md border border-border bg-card px-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                <div className="grid size-6 place-content-center rounded-full bg-primary text-primary-foreground font-semibold text-[11px]">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold text-foreground leading-none">{t("shell_accountStaff")}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{orgName ?? t("shell_defaultOrgName")}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-lg">
              <DropdownMenuLabel className="px-3 py-1.5 text-xs font-semibold">{t("header_account")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-md text-xs cursor-pointer">
                <Link href="/settings">{t("nav_settings")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-md text-xs cursor-pointer">
                <Link href="/security">{t("nav_security")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-md text-xs cursor-pointer">
                <Link href="/help">{t("nav_help")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-md text-xs text-destructive focus:bg-critical-bg focus:text-critical-text cursor-pointer"
                disabled={isLoggingOut}
                onSelect={() => {
                  void handleLogout();
                }}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
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
