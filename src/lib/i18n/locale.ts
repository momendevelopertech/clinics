export type Locale = "en" | "ar";

export type Dictionary = {
  [key: string]: string;
};

export const locales: Locale[] = ["en", "ar"];

export const defaultLocale: Locale = "en";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function getDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}