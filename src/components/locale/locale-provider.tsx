"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";
import type { Dictionary } from "@/lib/i18n/locale";

export type ClientLocale = {
  lang: "en" | "ar";
  dir: "ltr" | "rtl";
  dictionary: Dictionary;
  t: (key: string) => string;
};

const LocaleContext = createContext<ClientLocale>({
  lang: "en",
  dir: "ltr",
  dictionary: en,
  t: (key: string) => en[key] ?? key,
});

export function LocaleProvider({
  lang,
  children,
}: {
  lang: "en" | "ar";
  children: ReactNode;
}) {
  const value = useMemo<ClientLocale>(() => {
    const dictionary = lang === "ar" ? ar : en;
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      dictionary,
      t: (key: string) => dictionary[key] ?? key,
    };
  }, [lang]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): ClientLocale {
  return useContext(LocaleContext);
}