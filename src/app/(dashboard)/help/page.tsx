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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sent, setSent] = React.useState(false);

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
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Help & Support
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
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
              "flex items-center gap-4 p-4 rounded-[5px] border transition-all duration-200",
              "border-neutral-200/50 dark:border-neutral-800/50",
              "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl",
              "hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800",
              "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
            )}
          >
            <div className="p-2.5 rounded-[5px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
              <link.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <span className="font-medium text-neutral-900 dark:text-neutral-100 flex-1">
              {link.label}
            </span>
            <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden />
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <div className="rounded-[5px] border border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/40 dark:bg-neutral-950/40">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" aria-hidden />
            Frequently Asked Questions
          </h2>
        </div>
        <div className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {faq.question}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
              </summary>
              <div className="px-6 pb-4 text-neutral-600 dark:text-neutral-400">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="rounded-[5px] border border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-600" aria-hidden />
          Contact Support
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Can&apos;t find what you need? Send us a message and our team will respond within 24 business hours.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          {sent ? (
            <div className="flex items-center gap-2 rounded-[5px] border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200 px-4 py-3 text-sm">
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
              className="rounded-[5px]"
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
                "flex min-h-[100px] w-full rounded-[5px] border border-neutral-200 dark:border-neutral-800",
                "bg-white dark:bg-neutral-950 px-3 py-2 text-sm",
                "placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              )}
            />
          </div>
          <Button
            type="submit"
            className="rounded-[5px] bg-indigo-600 hover:bg-indigo-700"
          >
            <Mail className="h-4 w-4 mr-2" aria-hidden />
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
}
