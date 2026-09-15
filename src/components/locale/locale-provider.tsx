"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";
import type { Dictionary } from "@/lib/i18n/locale";

export type ClientLocale = {
  lang: "en" | "ar";
  dir: "ltr" | "rtl";
  dictionary: Dictionary;
  t: (key: string) => string;
  setLocale: (next: "en" | "ar") => void;
  toggleLocale: () => void;
};

const LocaleContext = createContext<ClientLocale>({
  lang: "ar",
  dir: "rtl",
  dictionary: ar,
  t: (key: string) => ar[key] ?? key,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function LocaleProvider({
  lang: initialLang,
  children,
}: {
  lang: "en" | "ar";
  children: ReactNode;
}) {
  const [lang, setLang] = useState<"en" | "ar">(initialLang);
  const router = useRouter();

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  const setLocale = (next: "en" | "ar") => {
    setLang(next);
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    }
    router.refresh();
  };

  const toggleLocale = () => {
    setLocale(lang === "ar" ? "en" : "ar");
  };

  const value = useMemo<ClientLocale>(() => {
    const dictionary = lang === "ar" ? ar : en;
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      dictionary,
      t: (key: string) => dictionary[key] ?? key,
      setLocale,
      toggleLocale,
    };
  }, [lang]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): ClientLocale {
  return useContext(LocaleContext);
}