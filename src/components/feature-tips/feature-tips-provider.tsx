"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/locale/locale-provider";
import { cn } from "@/lib/utils";
import {
  isTipDismissed,
  loadState,
  markTipDismissed,
  resetDismissed,
  setTipsEnabled,
} from "@/lib/feature-tips/storage";
import type {
  FeatureTipDefinition,
  VisibilityState,
} from "@/lib/feature-tips/types";
import { computeTipPosition, type ComputedPosition } from "@/lib/feature-tips/position";

type TipRegistration = {
  tipId: string;
  def: FeatureTipDefinition;
  getTarget: () => Element | null;
};

type FeatureTipsContextValue = {
  registerTip: (registration: TipRegistration) => () => void;
  resetAll: () => void;
  setTipsEnabled: (enabled: boolean) => void;
};

const FeatureTipsContext = React.createContext<FeatureTipsContextValue | null>(
  null,
);

const SHOW_DELAY_MS = 500;
const MOBILE_BREAKPOINT = 640;
const MAX_TARGET_RETRIES = 12;

function isElementVisible(element: Element): boolean {
  if (!element.isConnected) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

export function FeatureTipsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();

  const registrations = React.useRef(new Map<string, TipRegistration>());
  const registrationOrder = React.useRef<string[]>([]);
  const [version, setVersion] = React.useState(0);
  const [visibility, setVisibility] = React.useState<VisibilityState>({
    dismissed: {},
    enabled: true,
  });
  const hydrated = React.useRef(false);
  const [shownTipId, setShownTipId] = React.useState<string | null>(null);
  const [shownDefinition, setShownDefinition] =
    React.useState<FeatureTipDefinition | null>(null);
  const [position, setPosition] = React.useState<ComputedPosition | null>(null);
  const [measured, setMeasured] = React.useState(false);
  const tipRef = React.useRef<HTMLDivElement | null>(null);
  const sessionPathRef = React.useRef<string | null>(null);
  const showTimeoutRef = React.useRef<number | null>(null);
  const retriesRef = React.useRef(0);

  const refreshVersion = React.useCallback(() => setVersion((value) => value + 1), []);

  const registerTip = React.useCallback(
    (registration: TipRegistration) => {
      registrations.current.set(registration.tipId, registration);
      if (!registrationOrder.current.includes(registration.tipId)) {
        registrationOrder.current.push(registration.tipId);
      }
      refreshVersion();
      return () => {
        registrations.current.delete(registration.tipId);
        registrationOrder.current = registrationOrder.current.filter(
          (id) => id !== registration.tipId,
        );
        refreshVersion();
      };
    },
    [refreshVersion],
  );

  const applyReset = React.useCallback(() => {
    setVisibility(resetDismissed());
  }, []);

  const applyEnabled = React.useCallback((enabled: boolean) => {
    setVisibility(setTipsEnabled(enabled));
  }, []);

  React.useEffect(() => {
    const state = loadState();
    hydrated.current = true;
    setVisibility(state);
  }, []);

  const dismiss = React.useCallback((tipId: string) => {
    const next = markTipDismissed(tipId);
    setVisibility(next);
    setShownTipId(null);
    setShownDefinition(null);
    setPosition(null);
    setMeasured(false);
    sessionPathRef.current = pathname;
  }, [pathname]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!hydrated.current || !visibility.enabled) {
      return;
    }
    if (shownTipId) {
      return;
    }
    if (sessionPathRef.current === pathname) {
      return;
    }

    const ordered = registrationOrder.current.filter((id) =>
      registrations.current.has(id),
    );
    const ranked = ordered
      .map((id) => registrations.current.get(id))
      .filter((registration): registration is TipRegistration => Boolean(registration))
      .filter(({ def }) => !def.paths || def.paths.includes(pathname))
      .filter(({ tipId }) => !isTipDismissed(visibility, tipId))
      .sort(
        (a, b) =>
          (a.def.order ?? 0) - (b.def.order ?? 0) ||
          registrationOrder.current.indexOf(a.tipId) -
            registrationOrder.current.indexOf(b.tipId),
      );

    const candidates = ranked.filter(({ getTarget }) => {
      const element = getTarget();
      return element !== null && isElementVisible(element);
    });

    if (candidates.length === 0) {
      if (ranked.length > 0 && retriesRef.current < MAX_TARGET_RETRIES) {
        retriesRef.current += 1;
        const retryTimer = window.setTimeout(() => refreshVersion(), 600);
        return () => window.clearTimeout(retryTimer);
      }
      sessionPathRef.current = pathname;
      return;
    }

    const next = candidates[0];
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current);
    }
    showTimeoutRef.current = window.setTimeout(() => {
      sessionPathRef.current = pathname;
      setShownTipId(next.tipId);
      setShownDefinition(next.def);
    }, SHOW_DELAY_MS);

    return () => {
      if (showTimeoutRef.current) {
        window.clearTimeout(showTimeoutRef.current);
      }
    };
  }, [visibility, pathname, shownTipId, version, refreshVersion]);

  React.useEffect(() => {
    setShownTipId(null);
    setShownDefinition(null);
    setPosition(null);
    setMeasured(false);
    sessionPathRef.current = null;
    retriesRef.current = 0;
  }, [pathname]);

  React.useEffect(() => {
    if (!shownTipId) {
      return;
    }
    const registration = registrations.current.get(shownTipId);
    const target = registration?.getTarget();
    const tipElement = tipRef.current;
    if (!target || !tipElement || !registration) {
      return;
    }

    let animationFrame = 0;

    const measure = () => {
      if (!target.isConnected) {
        return;
      }
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const targetRect = target.getBoundingClientRect();
        const tipWidth = tipElement.offsetWidth;
        const tipHeight = tipElement.offsetHeight;
        if (tipWidth === 0 || tipHeight === 0) {
          return;
        }
        const mobile =
          typeof window.matchMedia === "function"
            ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
            : false;
        const preferred =
          registration.def.placement ?? (mobile ? "bottom" : "top");
        setPosition(
          computeTipPosition({
            targetRect,
            tipWidth,
            tipHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            preferred,
            mobile,
          }),
        );
        setMeasured(true);
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(target);
    resizeObserver.observe(tipElement);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [shownTipId]);

  React.useEffect(() => {
    if (!shownTipId) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss(shownTipId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shownTipId, dismiss]);

  const value = React.useMemo<FeatureTipsContextValue>(
    () => ({
      registerTip,
      resetAll: applyReset,
      setTipsEnabled: applyEnabled,
    }),
    [registerTip, applyReset, applyEnabled],
  );

  return (
    <FeatureTipsContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" ? (
        createPortal(
          <AnimatePresence>
            {shownTipId && shownDefinition ? (
              <motion.div
                key={shownTipId}
                ref={tipRef}
                role="region"
                aria-labelledby={`feature-tip-title-${shownTipId}`}
                aria-roledescription={t("featureTip_label")}
                className="pointer-events-auto fixed z-[9999] w-[20rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/60 bg-popover/95 p-4 text-popover-foreground shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/10"
                style={{
                  top: position ? `${position.top}px` : 0,
                  left: position ? `${position.left}px` : 0,
                  visibility: measured ? "visible" : "hidden",
                }}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {position ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute size-3 rotate-45 border border-white/60 bg-popover/95 dark:border-white/10",
                      position.placement === "top" && "top-full -mt-1.5 border-t-0 border-l-0",
                      position.placement === "bottom" && "bottom-full -mb-1.5 border-b-0 border-r-0",
                      position.placement === "left" && "left-full -ml-1.5 border-t-0 border-r-0",
                      position.placement === "right" && "right-full -mr-1.5 border-b-0 border-l-0",
                    )}
                    style={{
                      left: position.placement === "top" || position.placement === "bottom" ? position.arrowX : undefined,
                      top: position.placement === "top" || position.placement === "bottom" ? undefined : position.arrowY,
                    }}
                  />
                ) : null}
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-content-center rounded-xl bg-primary/10 text-primary">
                    {shownDefinition.icon ? (
                      <shownDefinition.icon className="h-4 w-4" aria-hidden />
                    ) : (
                      <Lightbulb className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2
                      id={`feature-tip-title-${shownTipId}`}
                      className="text-sm font-semibold tracking-tight text-foreground"
                    >
                      {t(shownDefinition.titleKey)}
                    </h2>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                      {t(shownDefinition.descKey)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(shownTipId)}
                    aria-label={t("featureTip_close")}
                    className="grid size-7 shrink-0 place-content-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => dismiss(shownTipId)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t("featureTip_gotIt")}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      ) : null}
    </FeatureTipsContext.Provider>
  );
}

export function useFeatureTips(): FeatureTipsContextValue {
  const context = React.useContext(FeatureTipsContext);
  if (!context) {
    throw new Error("useFeatureTips must be used within <FeatureTipsProvider>");
  }
  return context;
}