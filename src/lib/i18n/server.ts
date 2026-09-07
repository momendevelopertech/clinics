import "server-only";
import { cookies } from "next/headers";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";
import {
  defaultLocale,
  getDir,
  isLocale,
  type Dictionary,
  type Locale,
} from "./locale";

export const dictionaries: Record<Locale, Dictionary> = { en, ar };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get("lang")?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  return dictionaries[locale];
}

export async function getDirAndLocale(): Promise<{
  lang: Locale;
  dir: "ltr" | "rtl";
}> {
  const lang = await getLocale();
  return { lang, dir: getDir(lang) };
}