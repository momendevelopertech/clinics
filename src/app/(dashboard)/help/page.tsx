"use client";

import * as React from "react";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  BookOpen,
  ChevronRight,
  FileText,
  Calendar,
  Users,
  CreditCard,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { useFeatureTips } from "@/components/feature-tips/feature-tips-provider";
import { FeatureTip } from "@/components/feature-tips/feature-tip";

const faqs = [
  {
    question: "How do I add a new patient?",
    answer:
      "Go to Patients in the sidebar and click 'Add Patient'. Fill in the required fields (name, DOB, contact info) and save. The patient will receive an MRN automatically.",
  },
  {
    question: "How do I schedule an appointment?",
    answer:
      "Navigate to Appointments and use the scheduling tool. Select a patient, provider, date, and time. You can set reminder preferences in Settings.",
  },
  {
    question: "How do I manage billing and invoices?",
    answer:
      "Use the Billing section to create invoices, record payments, and track outstanding balances. Configure tax rates and invoice prefixes in Settings under Billing.",
  },
  {
    question: "How do I access encounter notes?",
    answer:
      "Open the Encounters section to view and document clinical encounters. Link encounters to appointments and patients for a complete record.",
  },
  {
    question: "Where can I find audit logs?",
    answer:
      "Audit logs track changes to patient records, appointments, and system settings. Contact your administrator if you need access to audit history.",
  },
];

const quickLinks = [
  { label: "Patient Management Guide", icon: Users, href: "/patients" },
  { label: "Appointment Scheduling", icon: Calendar, href: "/appointments" },
  { label: "Billing & Invoicing", icon: CreditCard, href: "/billing" },
  { label: "Documentation", icon: FileText, href: "/documents" },
];

export default function HelpPage() {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const { resetAll } = useFeatureTips();
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const handleResetTips = () => {
    resetAll();
    triggerGuidance("action_completed", t("help_tipsReset"));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !message) {
      toast.error("Please provide both an email and a message.");
      return;
    }
    window.location.href = `mailto:?subject=${encodeURIComponent("HealthCRM Support Request")}&body=${encodeURIComponent(`From: ${email}\n\n${message}`)}`;
    setSent(true);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Help & Support
        </h1>
        <p className="text-muted-foreground mt-1">
          Get help with HealthCRM, browse documentation, or reach our support team.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border transition-colors shadow-sm",
              "border-border bg-card hover:bg-muted-bg/50"
            )}
          >
            <div className="p-2.5 rounded-md bg-primary/10 text-primary">
              <link.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <span className="font-medium text-foreground flex-1">
              {link.label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted-bg/30">
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            Frequently Asked Questions
          </h2>
        </div>
        <div className="divide-y divide-border">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 hover:bg-muted-bg/50 transition-colors [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-foreground">
                  {faq.question}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" aria-hidden />
              </summary>
              <div className="px-6 pb-4 text-muted-foreground">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Feature Tips */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground tracking-tight mb-1 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
          {t("help_featureTips")}
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          {t("help_featureTipsDesc")}
        </p>
        <FeatureTip tipId="help-reset-tips">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={handleResetTips}
          >
            <Lightbulb className="h-4 w-4 mr-2" aria-hidden />
            {t("tip_help_reset_title")}
          </Button>
        </FeatureTip>
      </div>

      {/* Contact Support */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground tracking-tight mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
          Contact Support
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Can&apos;t find what you need? Send us a message and our team will respond within 24 business hours.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          {sent ? (
            <div className="flex items-center gap-2 rounded-lg border border-success-text/30 bg-success-bg text-success-text px-4 py-3 text-sm">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Your email client has been opened with your message. We&apos;ll get back to you within 24 business hours.
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="help-email">Email</Label>
            <Input
              id="help-email"
              type="email"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="help-message">Message</Label>
            <textarea
              id="help-message"
              placeholder="Describe your issue or question..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className={cn(
                "flex min-h-[100px] w-full rounded-md border border-border",
                "bg-background text-foreground px-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
            />
          </div>
          <Button
            type="submit"
            className="h-9"
          >
            <Mail className="h-4 w-4 mr-2" aria-hidden />
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
}
