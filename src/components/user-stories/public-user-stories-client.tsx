"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Crown,
  Eye,
  HeartPulse,
  Info,
  Pill,
  Search,
  Stethoscope,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { cn } from "@/lib/utils";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";
import {
  toPublicStories,
  type PublicRoleStory,
  type PublicTask,
} from "@/lib/user-stories-public";

const PlanBanner = dynamic(
  () => import("./plan-banner").then((module) => module.PlanBanner),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="mx-auto mb-6 h-16 max-w-6xl animate-pulse rounded-lg border border-border bg-card shadow-xs"
      />
    ),
  },
);

const ICONS: Record<string, React.ElementType> = {
  Bell,
  Crown,
  HeartPulse,
  Pill,
  Stethoscope,
  Users,
  Wallet,
};

function RoleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Info;
  return <Icon className={className ?? "h-4 w-4"} aria-hidden="true" />;
}

function routeLabelFor(route: string, lang: "ar" | "en"): string {
  const dict = lang === "ar" ? ar : en;
  const key = `nav_${route}`;
  const value = (dict as Record<string, string>)[key];
  return typeof value === "string" && value.length > 0 ? value : route;
}

const TaskItem = React.memo(function TaskItem({
  task,
  index,
  open,
  onToggle,
  whereLabel,
  resultLabel,
}: {
  task: PublicTask;
  index: number;
  open: boolean;
  onToggle: () => void;
  whereLabel: string;
  resultLabel: string;
}) {
  const { lang } = useLocale();
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-muted-bg/50 cursor-pointer"
      >
        <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
          <RoleIcon name={task.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="block truncate font-semibold text-foreground">{task.title[lang]}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border bg-muted-bg/30 px-5 py-4">
          {task.where[lang].length > 0 ? (
            <p className="text-sm">
              <span className="font-semibold text-foreground">{whereLabel}: </span>
              <span className="text-muted-foreground">{task.where[lang]}</span>
            </p>
          ) : null}
          <ol className="mt-3 space-y-2">
            {task.steps.map((step, stepIndex) => (
              <li key={stepIndex} className="flex gap-2.5 text-sm leading-6">
                <span className="grid size-5 shrink-0 place-content-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {stepIndex + 1}
                </span>
                <span className="text-foreground/90">{step[lang]}</span>
              </li>
            ))}
          </ol>
          {task.result[lang].length > 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-semibold text-foreground">{resultLabel}: </span>
                <span className="text-muted-foreground">{task.result[lang]}</span>
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
});

/**
 * Public onboarding guide: one story per clinic role, human language only.
 * Details render lazily (open accordion item only) to keep the DOM light.
 */
export function PublicUserStories() {
  const { t, lang } = useLocale();
  const stories: PublicRoleStory[] = React.useMemo(
    () => toPublicStories(routeLabelFor),
    [],
  );
  const [activeId, setActiveId] = React.useState(stories[0]?.id ?? "");
  const [query, setQuery] = React.useState("");
  const [openTask, setOpenTask] = React.useState<string | null>(null);

  const role = stories.find((item) => item.id === activeId) ?? stories[0];

  const tasks = React.useMemo(() => {
    if (!role) return [];
    const q = query.trim().toLowerCase();
    if (!q) return role.tasks;
    return role.tasks.filter((task) => {
      const hay = [
        task.title[lang],
        task.where[lang],
        task.result[lang],
        ...task.steps.map((step) => step[lang]),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [role, query, lang]);

  React.useEffect(() => {
    setOpenTask(tasks[0]?.id ?? null);
  }, [activeId, query, tasks]);

  const moduleLabel = React.useCallback(
    (key: string) => routeLabelFor(key, lang),
    [lang],
  );

  if (!role) return null;

  return (
    <div className="w-full">
      <PlanBanner />

      <div className="flex w-full flex-col gap-6 pb-6">
        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-content-center rounded-md bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t("nav_rolesGuide")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("rg_subtitle")}</p>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("rg_search")}
              className="h-9 w-full rounded-md border border-input bg-background pe-4 ps-10 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {stories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition cursor-pointer",
                item.id === role.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted-bg",
              )}
            >
              <RoleIcon name={item.icon} />
              {item.name[lang]}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <aside className="hidden md:block">
            <div className="sticky top-4 rounded-lg border border-border bg-card p-3 shadow-xs space-y-1">
              {stories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm font-semibold transition cursor-pointer",
                    item.id === role.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted-bg hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-content-center rounded-md",
                      item.id === role.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    <RoleIcon name={item.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{item.name[lang]}</span>
                    <span
                      className={cn(
                        "block text-xs font-normal",
                        item.id === role.id ? "opacity-80" : "text-muted-foreground",
                      )}
                    >
                      {item.tasks.length} · {t("rg_tasks")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
                  <RoleIcon name={role.icon} className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-bold text-foreground">{role.name[lang]}</h3>
              </div>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("rg_profile")}
              </h4>
              <p className="mt-1 text-sm leading-6 text-foreground/90">{role.profile[lang]}</p>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("rg_landing")}
              </h4>
              <p className="mt-1 text-sm leading-6 text-foreground/90">{role.landing[lang]}</p>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("rg_modules")}
              </h4>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {role.modules.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <span className="grid size-5 shrink-0 place-content-center rounded-full bg-success-bg text-success-text">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-foreground/90">{moduleLabel(key)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("userStories_sampleTasks")} ({tasks.length})
              </h4>
              {tasks.length === 0 ? (
                <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-xs">
                  {t("rg_noResults")}
                </p>
              ) : null}
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    open={openTask === task.id}
                    onToggle={() =>
                      setOpenTask(openTask === task.id ? null : task.id)
                    }
                    whereLabel={t("rg_where")}
                    resultLabel={t("rg_result")}
                  />
                ))}
              </div>
            </section>

            {role.boundaries.length > 0 ? (
              <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("rg_boundaries")}
                </h4>
                <ul className="mt-3 space-y-2">
                  {role.boundaries.map((boundary, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm leading-6">
                      <span className="grid size-5 shrink-0 place-content-center rounded-full bg-critical-bg text-critical-text">
                        <X className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-foreground/90">{boundary[lang]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
