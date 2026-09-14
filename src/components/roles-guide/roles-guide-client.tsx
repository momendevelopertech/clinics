"use client";

import * as React from "react";
import {
  Activity,
  Ban,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  Clock,
  Combine,
  Copy,
  CreditCard,
  Crown,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  Lock,
  MessageCircle,
  Pencil,
  Phone,
  Pill,
  Plug,
  Plus,
  Power,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Stethoscope,
  Trash2,
  Undo2,
  Upload,
  UserPlus,
  Users,
  Video,
  Wallet,
  Wrench,
  Package,
  X,
} from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { cn } from "@/lib/utils";
import { ROLES_GUIDE, getRoleModules } from "@/lib/roles-guide-data";

const ICONS: Record<string, React.ElementType> = {
  Activity, Ban, Bell, BookOpen, Building2, CalendarDays, CalendarPlus, Check,
  CheckCheck, ChevronDown, ClipboardList, Clock, Combine, Copy, CreditCard, Crown,
  Download, Eye, FileCheck2, FileText, FlaskConical, HeartPulse, Info, Lock,
  MessageCircle, Pencil, Phone, Pill, Plug, Plus, Power, Printer, RefreshCw,
  Save, Search, Send, Settings, ShieldCheck, Star, Stethoscope, Trash2, Undo2,
  Upload, UserPlus, Users, Video, Wallet, Wrench, Package, X,
};

function RoleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Info;
  return <Icon className={className ?? "h-4 w-4"} aria-hidden="true" />;
}

export function RolesGuideClient({
  hiddenRoleIds = [],
  hideBackend = false,
}: {
  /** Roles to exclude (e.g. platform-internal Super Admin on the public page). */
  hiddenRoleIds?: string[];
  /** Hide the internal "backend" row (implementation details for the public page). */
  hideBackend?: boolean;
} = {}) {
  const { t, lang } = useLocale();
  const visibleRoles = React.useMemo(
    () => ROLES_GUIDE.filter((r) => !hiddenRoleIds.includes(r.id)),
    [hiddenRoleIds],
  );
  const [activeId, setActiveId] = React.useState(visibleRoles[0]?.id ?? "");
  const [query, setQuery] = React.useState("");
  const [openTask, setOpenTask] = React.useState<string | null>(null);

  const role = visibleRoles.find((r) => r.id === activeId) ?? visibleRoles[0];
  const modules = React.useMemo(() => (role ? getRoleModules(role) : []), [role]);

  const tasks = React.useMemo(() => {
    if (!role) return [];
    const q = query.trim().toLowerCase();
    if (!q) return role.tasks;
    return role.tasks.filter((task) => {
      const hay = [
        task.title[lang], task.where[lang], task.backend[lang], task.result[lang],
        ...task.steps.map((s) => s[lang]),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [role, query, lang]);

  React.useEffect(() => {
    setOpenTask(tasks[0]?.id ?? null);
  }, [activeId, query]);

  if (!role) return null;

  const moduleLabel = (key: string) => {
    const dictKey = `nav_${key}`;
    const value = t(dictKey);
    return value === dictKey ? key : value;
  };

  return (
    <div className="flex w-full flex-col gap-6 pb-6">
      <section className="hero-glow surface-panel rounded-[28px] border border-white/60 px-6 py-6 dark:border-white/6">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-content-center rounded-[16px] bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">{t("nav_rolesGuide")}</h1>
            <p className="text-sm text-muted-foreground">{t("rg_subtitle")}</p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("rg_search")}
            className="h-11 w-full rounded-[16px] border border-border bg-white/80 pe-4 ps-10 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-white/[0.04]"
          />
        </div>
      </section>

      {/* Mobile: horizontal role tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {visibleRoles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActiveId(r.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-[14px] border px-3 py-2 text-sm font-semibold transition",
              r.id === role.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/60 bg-white/70 text-muted-foreground dark:border-white/6 dark:bg-white/[0.04]",
            )}
          >
            <RoleIcon name={r.icon} />
            {r.name[lang]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Desktop side panel */}
        <aside className="hidden md:block">
          <div className="surface-panel sticky top-4 rounded-[24px] border border-white/60 p-3 dark:border-white/6">
            {visibleRoles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveId(r.id)}
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-start text-sm font-semibold transition",
                  r.id === role.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.05]",
                )}
              >
                <span className={cn(
                  "grid size-9 shrink-0 place-content-center rounded-[12px]",
                  r.id === role.id ? "bg-white/20" : "bg-primary/10 text-primary",
                )}>
                  <RoleIcon name={r.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{r.name[lang]}</span>
                  <span className={cn("block text-xs font-normal", r.id === role.id ? "opacity-80" : "text-muted-foreground")}>
                    {r.tasks.length} · {t("rg_tasks")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0">
          <section className="surface-panel rounded-[24px] border border-white/60 p-5 dark:border-white/6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-content-center rounded-[16px] bg-primary/10 text-primary">
                <RoleIcon name={role.icon} className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold">{role.name[lang]}</h2>
            </div>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_profile")}</h3>
            <p className="mt-1 text-sm leading-7">{role.profile[lang]}</p>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_landing")}</h3>
            <p className="mt-1 text-sm leading-7">{role.landing[lang]}</p>
          </section>

          <section className="surface-panel mt-4 rounded-[24px] border border-white/60 p-5 dark:border-white/6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_modules")}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {modules.map((m) => (
                <li key={m.key} className="flex items-center gap-2 text-sm">
                  <span className="grid size-6 shrink-0 place-content-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-mono text-xs" dir="ltr">{m.key}</span>
                  <span className="truncate text-muted-foreground">{moduleLabel(m.key)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-4">
            <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("rg_tasks")} ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <p className="surface-panel rounded-[24px] border border-white/60 p-5 text-sm text-muted-foreground dark:border-white/6">
                {t("rg_noResults")}
              </p>
            ) : null}
            <div className="space-y-3">
              {tasks.map((task, index) => {
                const open = openTask === task.id;
                return (
                  <article key={task.id} className="surface-panel overflow-hidden rounded-[24px] border border-white/60 dark:border-white/6">
                    <button
                      type="button"
                      onClick={() => setOpenTask(open ? null : task.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 p-4 text-start"
                    >
                      <span className="grid size-10 shrink-0 place-content-center rounded-[14px] bg-primary/10 text-primary">
                        <RoleIcon name={task.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        <span className="block truncate font-semibold">{task.title[lang]}</span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </button>
                    {open ? (
                      <div className="border-t border-white/60 px-4 py-4 dark:border-white/6">
                        <p className="text-sm">
                          <span className="font-semibold">{t("rg_where")}: </span>
                          <span className="text-muted-foreground">{task.where[lang]}</span>
                        </p>
                        <ol className="mt-3 space-y-2">
                          {task.steps.map((step, i) => (
                            <li key={i} className="flex gap-2.5 text-sm leading-7">
                              <span className="grid size-6 shrink-0 place-content-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                              <span>{step[lang]}</span>
                            </li>
                          ))}
                        </ol>
                        {hideBackend ? null : (
                        <p className="mt-3 flex gap-2 text-sm">
                          <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span><span className="font-semibold">{t("rg_backend")}: </span><span className="text-muted-foreground">{task.backend[lang]}</span></span>
                        </p>
                        )}
                        <p className="mt-2 flex gap-2 text-sm">
                          <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span><span className="font-semibold">{t("rg_result")}: </span><span className="text-muted-foreground">{task.result[lang]}</span></span>
                        </p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="surface-panel mt-4 rounded-[24px] border border-white/60 p-5 dark:border-white/6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_boundaries")}</h3>
            <ul className="mt-3 space-y-2">
              {role.boundaries.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm leading-7">
                  <span className="grid size-6 shrink-0 place-content-center rounded-full bg-red-500/10 text-red-600 dark:text-red-300">
                    <X className="h-3.5 w-3.5" />
                  </span>
                  <span>{b[lang]}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
