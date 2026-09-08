"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity, CalendarClock, FileHeart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClientErrorMessage, logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

export default function PatientLoginPage() {
  const { t } = useLocale();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
    mrn: "",
    password: "",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.mrn || !formData.password) {
      toast.error(t("portal_fillAll"));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/patient-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("portal_loginFailed"));
      }

      await response.json();

      toast.success(t("portal_loginSuccess"));
      router.push("/patient-portal");
    } catch (error) {
      toast.error(getClientErrorMessage(error, t("portal_loginFailed")));
      logClientError("Patient login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/60 surface-panel lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-[640px] flex-col justify-between bg-[linear-gradient(155deg,rgba(10,68,92,0.96),rgba(15,123,120,0.9))] p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/82">
              <Activity className="h-3.5 w-3.5" />
              {t("portal_badge")}
            </div>
            <h1 className="mt-6 max-w-md text-5xl font-semibold leading-[1.03] tracking-[-0.05em]">
              {t("portal_heroTitle")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/74">
              {t("portal_heroBody")}
            </p>
          </div>

          <div className="grid gap-3">
            {[
              {
                icon: ShieldCheck,
                title: t("portal_feature1Title"),
                copy: t("portal_feature1Body"),
              },
              {
                icon: CalendarClock,
                title: t("portal_feature2Title"),
                copy: t("portal_feature2Body"),
              },
              {
                icon: FileHeart,
                title: t("portal_feature3Title"),
                copy: t("portal_feature3Body"),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-content-center rounded-[16px] bg-white/14">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/72">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[640px] items-center bg-white/74 px-5 py-8 dark:bg-slate-950/30 sm:px-10">
          <Card className="w-full border-white/60 bg-white/70 shadow-none dark:border-white/8 dark:bg-white/[0.03]">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t("portal_signIn")}
              </p>
              <CardTitle className="text-4xl font-semibold tracking-[-0.05em]">
                {t("portal_accessTitle")}
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                {t("portal_accessDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="gap-2 flex flex-col">
                  <Label htmlFor="email">{t("portal_email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("portal_emailPlaceholder")}
                    className="h-12 rounded-[18px] bg-white/80 dark:bg-white/[0.04]"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="gap-2 flex flex-col">
                  <Label htmlFor="mrn">{t("portal_mrn")}</Label>
                  <Input
                    id="mrn"
                    placeholder={t("portal_mrnPlaceholder")}
                    className="h-12 rounded-[18px] bg-white/80 dark:bg-white/[0.04]"
                    value={formData.mrn}
                    onChange={(e) =>
                      setFormData({ ...formData, mrn: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="gap-2 flex flex-col">
                  <Label htmlFor="password">{t("portal_password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("portal_passwordPlaceholder")}
                    className="h-12 rounded-[18px] bg-white/80 dark:bg-white/[0.04]"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-[18px] bg-linear-to-r from-primary to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:opacity-95"
                >
                  {loading ? t("portal_signingIn") : t("portal_openPortal")}
                </Button>

                <p className="text-center text-xs leading-5 text-muted-foreground">
                  {t("portal_noAccount")}
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
