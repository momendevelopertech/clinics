import { CircleSlash2 } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/locale/language-switcher";

export default async function SuspendedPage() {
  const t = await getDictionary();

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface-panel w-full max-w-md rounded-lg border border-border p-8 text-center shadow-sm">
        <div className="flex items-center justify-between">
          <div className="mx-auto grid size-16 place-content-center rounded-lg bg-critical-bg text-critical-text">
            <CircleSlash2 className="h-8 w-8" />
          </div>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
          {t["suspended_title"]}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t["suspended_body"]}
        </p>
      </div>
    </main>
  );
}