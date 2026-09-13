"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { FEATURE_DOC_LINKS, type ConfigGatedFeature } from "@/lib/feature-config";
import { useLocale } from "@/components/locale/locale-provider";

/**
 * Reusable "feature is not configured" banner.
 *
 * Always visible (never a silent fail): shows the real reason (missing env
 * var names), step-by-step activation steps, and the third-party note +
 * docs link when one exists. All strings come from i18n (`cfg_*`).
 */
export function FeatureNotConfiguredBanner({
  feature,
  missingEnvVars = [],
  devFallback = false,
}: {
  feature: ConfigGatedFeature;
  missingEnvVars?: string[];
  devFallback?: boolean;
}) {
  const { t } = useLocale();
  const docsUrl = FEATURE_DOC_LINKS[feature];

  return (
    <div
      role="alert"
      className="rounded-lg border border-warning-text/20 bg-warning-bg p-4 text-sm shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-content-center rounded-md bg-warning-text/10 text-warning-text">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-warning-text">
            {t(`cfg_feature_${feature}`)} · {t("cfg_badge")}
          </p>
          <p className="mt-1 text-warning-text/90">
            {devFallback ? t("cfg_devFallback") : t(`cfg_reason_${feature}`)}
          </p>
          {missingEnvVars.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingEnvVars.map((name) => (
                <code
                  key={name}
                  className="rounded-full bg-warning-text/15 px-2.5 py-1 font-mono text-xs font-semibold text-warning-text"
                >
                  {name}
                </code>
              ))}
            </div>
          ) : null}
          <ol className="mt-3 list-decimal space-y-1 ps-5 text-warning-text/90">
            <li>{t("cfg_stepEnv")}</li>
            <li>{t("cfg_stepRestart")}</li>
            <li>{t(`cfg_thirdParty_${feature}`)}</li>
          </ol>
          {docsUrl ? (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-medium text-warning-text underline underline-offset-2 hover:opacity-80"
            >
              {t("cfg_docsLink")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
