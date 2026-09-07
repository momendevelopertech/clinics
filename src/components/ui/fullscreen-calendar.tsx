"use client";

import * as React from "react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLocale } from "@/components/locale/locale-provider";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO
}

interface DisplayEvent {
  id: string | number;
  name: string;
  time: string;
  datetime: string;
}

interface CalendarData {
  day: Date;
  events: DisplayEvent[];
}

interface FullScreenCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

function toCalendarData(events: CalendarEvent[]): CalendarData[] {
  const byDay = new Map<string, CalendarData>();
  for (const ev of events) {
    const d = new Date(ev.date);
    const key = format(d, "yyyy-MM-dd");
    const existing = byDay.get(key);
    const display: DisplayEvent = {
      id: ev.id,
      name: ev.title,
      time: format(d, "h:mm a"),
      datetime: ev.date,
    };
    if (existing) {
      existing.events.push(display);
    } else {
      byDay.set(key, { day: d, events: [display] });
    }
  }
  return Array.from(byDay.values());
}

export function FullScreenCalendar({
  events,
  onEventClick,
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const { t } = useLocale();
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [currentMonth, setCurrentMonth] = React.useState(format(today, "MMM-yyyy"));
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  useMediaQuery("(min-width: 1024px)");
  const data = React.useMemo(() => toCalendarData(events), [events]);

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  });

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"));
    setSelectedDay(today);
  }

  const eventById = React.useMemo(() => {
    const m = new Map<string, CalendarEvent>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Calendar Header */}
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-[5px] border bg-muted/50 p-0.5 md:flex shadow-sm">
              <h1 className="p-1 text-xs uppercase text-muted-foreground">
                {format(today, "MMM")}
              </h1>
              <div className="flex w-full items-center justify-center rounded-[5px] border bg-background p-0.5 text-lg font-bold transition-colors">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                {format(firstDayCurrentMonth, "MMMM, yyyy")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(firstDayCurrentMonth, "MMM d, yyyy")} -{" "}
                {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <Button
            variant="outline"
            size="icon"
            className="hidden lg:flex rounded-[5px]"
            aria-label={t("calendar_search")}
          >
            <SearchIcon size={16} strokeWidth={2} aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="hidden h-6 lg:block" />

          <div className="inline-flex w-full -space-x-px rounded-[5px] shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
            <Button
              onClick={previousMonth}
              className="rounded-none rounded-s-[5px] shadow-none first:rounded-s-[5px] last:rounded-e-[5px] focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label={t("calendar_prevMonth")}
            >
              <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button
              onClick={goToToday}
              className="w-full rounded-none shadow-none first:rounded-s-[5px] last:rounded-e-[5px] focus-visible:z-10 md:w-auto"
              variant="outline"
            >
              {t("calendar_today")}
            </Button>
            <Button
              onClick={nextMonth}
              className="rounded-none rounded-e-[5px] shadow-none first:rounded-s-[5px] last:rounded-e-[5px] focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label={t("calendar_nextMonth")}
            >
              <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>

          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <Separator orientation="horizontal" className="block w-full md:hidden" />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="lg:flex lg:flex-auto lg:flex-col">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-y border-x text-center text-xs font-semibold leading-6 text-muted-foreground">
          <div className="border-r py-2.5">{t("availability_sun")}</div>
          <div className="border-r py-2.5">{t("availability_mon")}</div>
          <div className="border-r py-2.5">{t("availability_tue")}</div>
          <div className="border-r py-2.5">{t("availability_wed")}</div>
          <div className="border-r py-2.5">{t("availability_thu")}</div>
          <div className="border-r py-2.5">{t("availability_fri")}</div>
          <div className="py-2.5">{t("availability_sat")}</div>
        </div>

        {/* Calendar Days */}
        <div className="flex text-xs leading-6 lg:flex-auto">
          {/* Desktop: full month grid with event cards */}
          <div className="hidden w-full border-x lg:grid lg:grid-cols-7 lg:grid-rows-6">
            {days.map((day) => {
              const dayData = data.filter((d) => isSameDay(d.day, day));

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      !isSameMonth(day, firstDayCurrentMonth) &&
                      "bg-accent/30 text-muted-foreground",
                    "relative flex min-h-[100px] flex-col border-b border-r transition-colors hover:bg-muted/50 focus-visible:z-10 cursor-pointer",
                    !isEqual(day, selectedDay) && "hover:bg-accent/50"
                  )}
                >
                  <header className="flex items-center justify-between p-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(day);
                      }}
                      className={cn(
                        isEqual(day, selectedDay) && "text-primary-foreground",
                        !isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          isSameMonth(day, firstDayCurrentMonth) &&
                          "text-foreground",
                        !isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          !isSameMonth(day, firstDayCurrentMonth) &&
                          "text-muted-foreground",
                        isEqual(day, selectedDay) &&
                          isToday(day) &&
                          "border-none bg-primary text-primary-foreground",
                        isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          "bg-primary text-primary-foreground",
                        (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                        "flex h-7 w-7 items-center justify-center rounded-[5px] text-xs transition-colors hover:border hover:border-border"
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>
                        {format(day, "d")}
                      </time>
                    </button>
                  </header>
                  <div className="flex-1 overflow-hidden p-2.5">
                    {dayData.map((dayGroup) => (
                      <div key={dayGroup.day.toISOString()} className="space-y-1.5">
                        {dayGroup.events.slice(0, 2).map((ev) => {
                          const calEv = eventById.get(String(ev.id));
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (calEv) {
                                  onEventClick?.(calEv);
                                }
                              }}
                              className="flex flex-col items-start gap-1 rounded-[5px] border bg-muted/50 p-2 text-xs leading-tight transition-all hover:bg-muted hover:border-primary/30 cursor-pointer"
                            >
                              <p className="font-medium leading-none line-clamp-1">
                                {ev.name}
                              </p>
                              <p className="leading-none text-muted-foreground">
                                {ev.time}
                              </p>
                            </div>
                          );
                        })}
                        {dayGroup.events.length > 2 && (
                          <div className="text-xs text-muted-foreground pl-2">
                            {t("calendar_more").replace("{n}", String(dayGroup.events.length - 2))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: compact grid */}
          <div className="isolate grid w-full grid-cols-7 grid-rows-6 border-x lg:hidden">
            {days.map((day) => {
              const dayData = data.filter((d) => isSameDay(d.day, day));
              return (
                <button
                  onClick={() => setSelectedDay(day)}
                  key={day.toISOString()}
                  type="button"
                  className={cn(
                    isEqual(day, selectedDay) && "text-primary-foreground",
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      isSameMonth(day, firstDayCurrentMonth) &&
                      "text-foreground",
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      !isSameMonth(day, firstDayCurrentMonth) &&
                      "text-muted-foreground",
                    (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                    "flex h-14 flex-col border-b border-r px-2 py-2 transition-colors hover:bg-muted focus-visible:z-10 rounded-none"
                  )}
                >
                  <time
                    dateTime={format(day, "yyyy-MM-dd")}
                    className={cn(
                      "ml-auto flex size-6 items-center justify-center rounded-[5px]",
                      isEqual(day, selectedDay) &&
                        isToday(day) &&
                        "bg-primary text-primary-foreground",
                      isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </time>
                  {dayData.length > 0 && (
                    <div className="-mx-0.5 mt-auto flex flex-wrap-reverse">
                      {dayData.flatMap((d) =>
                        d.events.map((ev) => (
                          <span
                            key={ev.id}
                            className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        ))
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
