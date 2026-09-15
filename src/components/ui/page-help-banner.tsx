import { Clock, Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHelpBanner — reusable onboarding banner rendered at the top of a page.
 *
 * Explains: what this page is for, who should use it, and the key action a
 * user can take. Copy is passed in already-translated via the page's i18n
 * dictionary (never hardcode English inside this component).
 */
export function PageHelpBanner({
  title,
  description,
  audience,
  actionHint,
  className,
}: {
  title: string;
  description: string;
  audience?: string;
  actionHint?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-2xs",
        className,
      )}
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-8 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
          {(audience || actionHint) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {audience ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {audience}
                </span>
              ) : null}
              {actionHint ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {actionHint}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}