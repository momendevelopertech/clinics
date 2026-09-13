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
          className={`gap-2 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted ${
            compact ? "h-9 w-9" : "h-9 px-3"
          }`}
          aria-label={t("lang_label")}
        >
          <Languages className="h-4 w-4 text-muted-foreground" />
          {!compact ? (
            <span className="hidden sm:inline">{lang === "ar" ? "العربية" : "EN"}</span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-lg">
        <DropdownMenuLabel className="px-3 py-1.5 text-xs font-semibold">{t("lang_label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setLocale("en")} className="rounded-md text-xs cursor-pointer">
          English
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLocale("ar")} className="rounded-md text-xs cursor-pointer">
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}