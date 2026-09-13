"use client";
import { FileText, MessageCircle } from "lucide-react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FeatureNotConfiguredBanner } from "@/components/ui/feature-not-configured-banner";
import { useLocale } from "@/components/locale/locale-provider";
import type { SoapNote } from "@/components/encounters/encounters-workspace";

type AiAssistCardProps = {
  encounterId: string;
  soap: SoapNote;
  setSoap: (value: SoapNote) => void;
};

type ScribeResult = {
  ok: boolean;
  enabled: boolean;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  error?: string;
};

type SummaryResult = {
  ok: boolean;
  enabled: boolean;
  structured?: {
    reason?: string;
    findings: string[];
    planSummary: string[];
    followUpDays: number | null;
    prescriptions: { name: string; dosage: string }[];
  };
  narrative?: string | null;
  error?: string;
};

export function AiAssistCard({ encounterId, soap, setSoap }: AiAssistCardProps) {
  const { t } = useLocale();
  const [transcript, setTranscript] = useState("");
  const [thinking, setThinking] = useState<"idle" | "scribe" | "summary">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResult["structured"] | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [aiMissing, setAiMissing] = useState<string[]>([]);

  const runScribe = async () => {
    if (!transcript.trim()) return;
    setThinking("scribe");
    setNotice(null);
    try {
      const response = await fetch("/api/ai/scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounterId, transcript: transcript.trim() }),
      });
      const result = (await response.json()) as ScribeResult;
      if (response.status === 503 && result.enabled === false) {
        setAiUnavailable(true);
        setAiMissing(["AI_PROVIDER", "AI_API_KEY"]);
        setNotice(t("ai_notConfigured"));
        return;
      }
      if (!response.ok || !result.ok) {
        setNotice(result?.error ?? t("ai_error"));
        return;
      }
      setSoap({
        subjective: result.subjective ?? soap.subjective,
        objective: result.objective ?? soap.objective,
        assessment: result.assessment ?? soap.assessment,
        plan: result.plan ?? soap.plan,
      });
      setTranscript("");
    } catch {
      setNotice(t("ai_error"));
    } finally {
      setThinking("idle");
    }
  };

  const runSummary = async () => {
    setThinking("summary");
    setNotice(null);
    setSummary(null);
    try {
      const response = await fetch(`/api/ai/summary?encounterId=${encodeURIComponent(encounterId)}`);
      const result = (await response.json()) as SummaryResult;
      if (response.status === 503 && result.enabled === false) {
        setAiUnavailable(true);
        setAiMissing(["AI_PROVIDER", "AI_API_KEY"]);
        setNotice(t("ai_notConfigured"));
        return;
      }
      if (!response.ok || !result.ok) {
        setNotice(result?.error ?? t("ai_error"));
        return;
      }
      setSummary(result.structured ?? null);
    } catch {
      setNotice(t("ai_error"));
    } finally {
      setThinking("idle");
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-border p-3 bg-muted/20">
      <details open className="group">
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
          {t("ai_title")}
        </summary>
        <div className="mt-2 space-y-2">
          {aiUnavailable ? (
            <FeatureNotConfiguredBanner feature="ai" missingEnvVars={aiMissing} />
          ) : (
            <>
              <Textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder={t("ai_scribePlaceholder")}
                rows={3}
                className="bg-card"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={thinking !== "idle" || !transcript.trim()}
                  onClick={() => void runScribe()}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" />{thinking === "scribe" ? t("common_loading") : t("ai_scribe")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={thinking !== "idle"}
                  onClick={() => void runSummary()}
                >
                  <FileText className="mr-1.5 h-4 w-4" />{thinking === "summary" ? t("common_loading") : t("ai_summary")}
                </Button>
              </div>
              {notice ? <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md border border-amber-200/50">{notice}</p> : null}
              {summary ? (
                <div className="space-y-2 rounded-md border border-border bg-card p-3 text-xs shadow-xs">
                  {summary.findings.length ? (
                    <div>
                      <p className="font-semibold text-foreground">{t("ai_findings")}</p>
                      <ul className="list-inside list-disc text-muted-foreground mt-1">{summary.findings.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                  ) : null}
                  {summary.planSummary.length ? (
                    <div>
                      <p className="font-semibold text-foreground">{t("ai_plan")}</p>
                      <ul className="list-inside list-disc text-muted-foreground mt-1">{summary.planSummary.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                  ) : null}
                  {summary.followUpDays ? (
                    <p className="text-muted-foreground"><strong className="font-semibold text-foreground">{t("ai_followUp")}:</strong> {summary.followUpDays} {t("common_days")}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </details>
    </div>
  );
}