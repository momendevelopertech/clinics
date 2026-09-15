"use client";

import { Globe } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLocale, toggleLocale } = useLocale();

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleLocale}
        className="h-9 px-2.5 gap-1.5 rounded-md border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer shadow-2xs"
        title={lang === "ar" ? "Switch to English" : "التحويل للغة العربية"}
        aria-label="Toggle language"
      >
        <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-bold text-primary">
          {lang === "ar" ? "EN" : "عربي"}
        </span>
      </Button>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 shadow-2xs"
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => setLocale("ar")}
        className={cn(
          "px-2.5 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer",
          lang === "ar"
            ? "bg-card text-primary shadow-2xs"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        العربية
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "px-2.5 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer",
          lang === "en"
            ? "bg-card text-primary shadow-2xs"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        English
      </button>
    </div>
  );
}