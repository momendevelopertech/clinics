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

export function RolesGuideClient() {
  const { t, lang } = useLocale();
  const [activeId, setActiveId] = React.useState(ROLES_GUIDE[0]?.id ?? "");
  const [query, setQuery] = React.useState("");
  const [openTask, setOpenTask] = React.useState<string | null>(null);

  const role = ROLES_GUIDE.find((r) => r.id === activeId) ?? ROLES_GUIDE[0];
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
  }, [activeId, query, tasks]);

  if (!role) return null;

  const moduleLabel = (key: string) => {
    const dictKey = `nav_${key}`;
    const value = t(dictKey);
    return value === dictKey ? key : value;
  };

  return (
    <div className="flex w-full flex-col gap-6 pb-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-content-center rounded-md bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("nav_rolesGuide")}</h1>
            <p className="text-sm text-muted-foreground">{t("rg_subtitle")}</p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("rg_search")}
            className="h-9 w-full rounded-md border border-input bg-background pe-4 ps-10 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </section>

      {/* Mobile: horizontal role tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {ROLES_GUIDE.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActiveId(r.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition cursor-pointer",
              r.id === role.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted-bg",
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
          <div className="sticky top-4 rounded-lg border border-border bg-card p-3 shadow-xs space-y-1">
            {ROLES_GUIDE.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveId(r.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm font-semibold transition cursor-pointer",
                  r.id === role.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted-bg hover:text-foreground",
                )}
              >
                <span className={cn(
                  "grid size-8 shrink-0 place-content-center rounded-md",
                  r.id === role.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary",
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
        <div className="min-w-0 space-y-4">
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
                <RoleIcon name={role.icon} className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-foreground">{role.name[lang]}</h2>
            </div>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_profile")}</h3>
            <p className="mt-1 text-sm leading-6 text-foreground/90">{role.profile[lang]}</p>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_landing")}</h3>
            <p className="mt-1 text-sm leading-6 text-foreground/90">{role.landing[lang]}</p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_modules")}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {modules.map((m) => (
                <li key={m.key} className="flex items-center gap-2 text-sm">
                  <span className="grid size-5 shrink-0 place-content-center rounded-full bg-success-bg text-success-text">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-mono text-xs text-primary" dir="ltr">{m.key}</span>
                  <span className="truncate text-muted-foreground">{moduleLabel(m.key)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("rg_tasks")} ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-xs">
                {t("rg_noResults")}
              </p>
            ) : null}
            <div className="space-y-3">
              {tasks.map((task, index) => {
                const open = openTask === task.id;
                return (
                  <article key={task.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
                    <button
                      type="button"
                      onClick={() => setOpenTask(open ? null : task.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 p-4 text-start hover:bg-muted-bg/50 transition-colors cursor-pointer"
                    >
                      <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
                        <RoleIcon name={task.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        <span className="block truncate font-semibold text-foreground">{task.title[lang]}</span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </button>
                    {open ? (
                      <div className="border-t border-border bg-muted-bg/30 px-5 py-4">
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">{t("rg_where")}: </span>
                          <span className="text-muted-foreground">{task.where[lang]}</span>
                        </p>
                        <ol className="mt-3 space-y-2">
                          {task.steps.map((step, i) => (
                            <li key={i} className="flex gap-2.5 text-sm leading-6">
                              <span className="grid size-5 shrink-0 place-content-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                              <span className="text-foreground/90">{step[lang]}</span>
                            </li>
                          ))}
                        </ol>
                        <p className="mt-3 flex items-center gap-2 text-sm">
                          <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span><span className="font-semibold text-foreground">{t("rg_backend")}: </span><span className="text-muted-foreground">{task.backend[lang]}</span></span>
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-sm">
                          <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span><span className="font-semibold text-foreground">{t("rg_result")}: </span><span className="text-muted-foreground">{task.result[lang]}</span></span>
                        </p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rg_boundaries")}</h3>
            <ul className="mt-3 space-y-2">
              {role.boundaries.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm leading-6">
                  <span className="grid size-5 shrink-0 place-content-center rounded-full bg-critical-bg text-critical-text">
                    <X className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground/90">{b[lang]}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
