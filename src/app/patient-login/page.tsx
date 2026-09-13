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
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-xl lg:grid-cols-[1fr_1fr]">
        <section className="hidden min-h-[600px] flex-col justify-between border-r border-border bg-[#0F766E] p-8 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
              <Activity className="h-3.5 w-3.5" />
              {t("portal_badge")}
            </div>
            <h1 className="mt-8 max-w-md text-3xl font-bold leading-tight tracking-tight">
              {t("portal_heroTitle")}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
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
                className="rounded-lg border border-white/15 bg-white/10 p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-content-center rounded-md bg-white/15">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-white/75">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[600px] items-center bg-white px-6 py-8 sm:px-10">
          <Card className="w-full border-none shadow-none bg-transparent">
            <CardHeader className="space-y-1.5 p-0 mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {t("portal_signIn")}
              </p>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                {t("portal_accessTitle")}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                {t("portal_accessDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="gap-1.5 flex flex-col">
                  <Label htmlFor="email" className="text-xs font-semibold">{t("portal_email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("portal_emailPlaceholder")}
                    className="h-9 rounded-md bg-white border-input text-xs"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="gap-1.5 flex flex-col">
                  <Label htmlFor="mrn" className="text-xs font-semibold">{t("portal_mrn")}</Label>
                  <Input
                    id="mrn"
                    placeholder={t("portal_mrnPlaceholder")}
                    className="h-9 rounded-md bg-white border-input text-xs"
                    value={formData.mrn}
                    onChange={(e) =>
                      setFormData({ ...formData, mrn: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="gap-1.5 flex flex-col">
                  <Label htmlFor="password" className="text-xs font-semibold">{t("portal_password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("portal_passwordPlaceholder")}
                    className="h-9 rounded-md bg-white border-input text-xs"
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
                  className="h-9 w-full rounded-md bg-primary hover:bg-[#115E59] text-xs font-semibold text-white shadow-2xs mt-2 cursor-pointer"
                >
                  {loading ? t("portal_signingIn") : t("portal_openPortal")}
                </Button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground mt-2">
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
