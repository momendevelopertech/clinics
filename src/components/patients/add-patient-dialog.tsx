"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Heart,
  AlertCircle,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale/locale-provider";
import { patientCreateSchema, type PatientCreateInput } from "@/lib/validations";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"] as const;
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as const;

interface AddPatientDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function AddPatientDialog({ onSuccess, trigger }: AddPatientDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useLocale();

  const genderLabel = (g: string) => {
    const map: Record<string, string> = {
      "Male": t("gender_male"),
      "Female": t("gender_female"),
      "Other": t("gender_other"),
      "Prefer not to say": t("gender_preferNot"),
    };
    return map[g] ?? g;
  };

  const bloodLabel = (b: string) => (b === "Unknown" ? t("bloodType_unknown") : b);

  const form = useForm<PatientCreateInput>({
    resolver: zodResolver(patientCreateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: undefined,
      gender: undefined,
      email: "",
      phone: "",
      phoneSecondary: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      bloodType: undefined,
      allergies: "",
      primaryCareProvider: undefined,
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      status: "Active",
    },
  });

  const onSubmit = async (data: PatientCreateInput) => {
    try {
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        email: data.email || null,
        phone: data.phone || null,
        phoneSecondary: data.phoneSecondary || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        country: data.country || null,
        bloodType: data.bloodType || null,
        allergies: data.allergies || null,
        primaryCareProvider: data.primaryCareProvider || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        emergencyContactRelationship: data.emergencyContactRelationship || null,
      };

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("common_error"));
      }

      setOpen(false);
      form.reset();
      toast.success(t("addPatient_success"));
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common_error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-[5px]">
            <Plus className="mr-2 h-4 w-4" />
            {t("addPatient_trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 gap-0",
          "border-0 shadow-2xl shadow-neutral-900/10 dark:shadow-neutral-950/50",
          "bg-white dark:bg-neutral-950",
          "ring-1 ring-neutral-200/80 dark:ring-neutral-800/80 rounded-[5px]"
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "absolute inset-0 h-24 -z-10 rounded-t-[5px]",
              "bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent"
            )}
          />
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {t("addPatient_title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t("addPatient_desc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 pb-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  {t("addPatient_basicInfo")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("addPatient_firstName")}</Label>
                    <Input
                      id="firstName"
                      className="rounded-[5px]"
                      placeholder={t("firstName_placeholder")}
                      {...form.register("firstName")}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-xs text-red-500">{form.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("addPatient_lastName")}</Label>
                    <Input
                      id="lastName"
                      className="rounded-[5px]"
                      placeholder={t("lastName_placeholder")}
                      {...form.register("lastName")}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-xs text-red-500">{form.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {t("addPatient_dob")}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      className="rounded-[5px]"
                      {...form.register("dateOfBirth")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">{t("addPatient_gender")}</Label>
                    <Select
                      value={form.watch("gender") ?? ""}
                      onValueChange={(v) => form.setValue("gender", v || undefined)}
                    >
                      <SelectTrigger id="gender" className="rounded-[5px]">
                        <SelectValue placeholder={t("addPatient_select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {genderLabel(g)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  {t("addPatient_contactInfo")}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("addPatient_email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    className="rounded-[5px]"
                    placeholder={t("email_placeholder")}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {t("addPatient_phone")}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      className="rounded-[5px]"
                      placeholder={t("phone_placeholder")}
                      {...form.register("phone")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneSecondary">{t("addPatient_secondaryPhone")}</Label>
                    <Input
                      id="phoneSecondary"
                      type="tel"
                      className="rounded-[5px]"
                      placeholder={t("secondaryPhone_placeholder")}
                      {...form.register("phoneSecondary")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  {t("addPatient_address")}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="address">{t("addPatient_street")}</Label>
                  <Input
                    id="address"
                    className="rounded-[5px]"
                    placeholder={t("street_placeholder")}
                    {...form.register("address")}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("addPatient_city")}</Label>
                    <Input id="city" className="rounded-[5px]" placeholder={t("city_placeholder")} {...form.register("city")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">{t("addPatient_state")}</Label>
                    <Input id="state" className="rounded-[5px]" placeholder={t("state_placeholder")} {...form.register("state")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">{t("addPatient_zip")}</Label>
                    <Input id="zip" className="rounded-[5px]" placeholder={t("zip_placeholder")} {...form.register("zip")} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-indigo-500" />
                  {t("addPatient_medical")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bloodType">{t("addPatient_bloodType")}</Label>
                    <Select
                      value={form.watch("bloodType") ?? ""}
                      onValueChange={(v) => form.setValue("bloodType", v || undefined)}
                    >
                      <SelectTrigger id="bloodType" className="rounded-[5px]">
                        <SelectValue placeholder={t("addPatient_select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_TYPES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {bloodLabel(b)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryCareProvider" className="flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" /> {t("addPatient_primaryCare")}
                    </Label>
                    <Input
                      id="primaryCareProvider"
                      className="rounded-[5px]"
                      placeholder={t("primaryCare_placeholder")}
                      {...form.register("primaryCareProvider")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {t("addPatient_allergies")}
                  </Label>
                  <Textarea
                    id="allergies"
                    className="rounded-[5px] min-h-[60px]"
                    placeholder={t("addPatient_allergiesPlaceholder")}
                    {...form.register("allergies")}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-500" />
                  {t("addPatient_emergency")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">{t("addPatient_name")}</Label>
                    <Input
                      id="emergencyContactName"
                      className="rounded-[5px]"
                      placeholder={t("emergencyName_placeholder")}
                      {...form.register("emergencyContactName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">{t("addPatient_phone")}</Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      className="rounded-[5px]"
                      placeholder={t("emergencyPhone_placeholder")}
                      {...form.register("emergencyContactPhone")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelationship">{t("addPatient_relationship")}</Label>
                  <Input
                    id="emergencyContactRelationship"
                    className="rounded-[5px]"
                    placeholder={t("addPatient_relationshipPlaceholder")}
                    {...form.register("emergencyContactRelationship")}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-[5px]">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[5px]">
                {t("appts_cancel")}
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[5px]">
                {t("addPatient_save")}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}