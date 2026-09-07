"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, t } = useLocale();
  const router = useRouter();

  function setLocale(next: "en" | "ar") {
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
    // Force a full reload so the <html dir> attribute (RTL) takes effect cleanly.
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={`gap-2 rounded-[14px] border border-white/55 bg-white/60 text-sm font-medium dark:border-white/6 dark:bg-white/[0.03] ${
            compact ? "h-10 w-10" : "h-9 px-3"
          }`}
          aria-label={t("lang_label")}
        >
          <Languages className="h-4 w-4" />
          {!compact ? (
            <span className="hidden sm:inline">{lang === "ar" ? "العربية" : "EN"}</span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-[16px]">
        <DropdownMenuLabel>{t("lang_label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setLocale("en")} className="rounded-[12px]">
          English
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLocale("ar")} className="rounded-[12px]">
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}