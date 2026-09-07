"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale/locale-provider";

import type { Patient } from "@/context/MedicalContext";

const buildBookAppointmentSchema = (t: (key: string) => string) =>
  z.object({
    patientId: z.string().min(1, t("book_requirePatient")),
    provider: z.string().min(1, t("book_requireProvider")),
    date: z.string().min(1, t("book_requireDate")),
    time: z.string().min(1, t("book_requireTime")),
    type: z.string().min(1, t("book_requireType")),
  });

type BookAppointmentFormValues = z.infer<
  ReturnType<typeof buildBookAppointmentSchema>
>;

const APPOINTMENT_TYPES = [
  { value: "consultation" },
  { value: "Follow-up" },
  { value: "New Patient" },
  { value: "Procedure" },
  { value: "Telehealth" },
];

const PROVIDERS = [
  { value: "Dr. Jane Smith", label: "Dr. Jane Smith" },
  { value: "Dr. Robert Chen", label: "Dr. Robert Chen" },
];

interface BookAppointmentDialogProps {
  patients: Patient[];
  onBook: (data: {
    patientId: string;
    provider: string;
    date: string;
    time: string;
    type: string;
    duration: string;
    status: string;
  }) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BookAppointmentDialog({
  patients,
  onBook,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: BookAppointmentDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;

  const { t } = useLocale();

  const bookAppointmentSchema = React.useMemo(
    () => buildBookAppointmentSchema(t),
    [t]
  );

  const apptTypeLabel = (v: string) => {
    const map: Record<string, string> = {
      consultation: t("apptType_consultation"),
      "Follow-up": t("apptType_followup"),
      "New Patient": t("apptType_newPatient"),
      Procedure: t("apptType_procedure"),
      Telehealth: t("apptType_telehealth"),
    };
    return map[v] ?? v;
  };

  const form = useForm<BookAppointmentFormValues>({
    resolver: zodResolver(bookAppointmentSchema),
    defaultValues: {
      patientId: "",
      provider: "",
      date: "",
      time: "",
      type: "",
    },
  });
  const selectedPatientId = useWatch({
    control: form.control,
    name: "patientId",
  });
  const selectedProvider = useWatch({
    control: form.control,
    name: "provider",
  });
  const selectedType = useWatch({
    control: form.control,
    name: "type",
  });

  const onSubmit = (data: BookAppointmentFormValues) => {
    onBook({
      ...data,
      duration: "30 min",
      status: "Scheduled",
    });
    setOpen(false);
    form.reset();
    toast.success(t("book_success"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            className={cn(
              "relative overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600",
              "hover:from-violet-700 hover:via-indigo-700 hover:to-violet-700",
              "text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30",
              "transition-all duration-300 hover:-translate-y-0.5",
              "border-0"
            )}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CalendarDays className="w-4 h-4 mr-2" />
            {t("book_title")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-[440px] p-0 gap-0 overflow-hidden",
          "border-0 shadow-2xl shadow-neutral-900/10 dark:shadow-neutral-950/50",
          "bg-white dark:bg-neutral-950",
          "ring-1 ring-neutral-200/80 dark:ring-neutral-800/80"
        )}
      >
        <div className="relative">
          {/* Premium gradient header */}
          <div
            className={cn(
              "absolute inset-0 h-32 -z-10",
              "bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent dark:from-violet-600/20 dark:via-indigo-600/10"
            )}
          />
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {t("book_title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t("book_desc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 pb-6 space-y-5">
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* Patient */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="patientId"
                      className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-violet-500" />
                      {t("book_patient")}
                    </Label>
                    <Select
                      onValueChange={(v) => form.setValue("patientId", v)}
                      value={selectedPatientId}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full h-11 rounded-[5px] border-neutral-200 dark:border-neutral-800",
                          "bg-white dark:bg-neutral-900/50",
                          "hover:border-violet-300 dark:hover:border-violet-700/50",
                          "focus-visible:ring-violet-500/30 focus-visible:border-violet-400",
                          "transition-colors duration-200"
                        )}
                      >
                        <SelectValue placeholder={t("book_selectPatient")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-[5px] border-neutral-200 dark:border-neutral-800 shadow-xl">
                        {patients.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="rounded-[5px] focus:bg-violet-50 dark:focus:bg-violet-950/30"
                          >
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.patientId && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {form.formState.errors.patientId.message}
                      </p>
                    )}
                  </div>

                  {/* Provider */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="provider"
                      className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-violet-500" />
                      {t("appts_provider")}
                    </Label>
                    <Select
                      onValueChange={(v) => form.setValue("provider", v)}
                      value={selectedProvider}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full h-11 rounded-[5px] border-neutral-200 dark:border-neutral-800",
                          "bg-white dark:bg-neutral-900/50",
                          "hover:border-violet-300 dark:hover:border-violet-700/50",
                          "focus-visible:ring-violet-500/30"
                        )}
                      >
                        <SelectValue placeholder={t("book_selectProvider")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-[5px] shadow-xl">
                        {PROVIDERS.map((p) => (
                          <SelectItem
                            key={p.value}
                            value={p.value}
                            className="rounded-[5px] focus:bg-violet-50 dark:focus:bg-violet-950/30"
                          >
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.provider && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {form.formState.errors.provider.message}
                      </p>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="date"
                        className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2"
                      >
                        <Calendar className="w-3.5 h-3.5 text-violet-500" />
                        {t("appts_date")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="date"
                          type="date"
                          {...form.register("date")}
                          className={cn(
                            "h-11 rounded-[5px] pl-4 pr-10",
                            "border-neutral-200 dark:border-neutral-800",
                            "focus-visible:ring-violet-500/30 focus-visible:border-violet-400"
                          )}
                        />
                        <Calendar
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
                          strokeWidth={2}
                        />
                      </div>
                      {form.formState.errors.date && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {form.formState.errors.date.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="time"
                        className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2"
                      >
                        <Clock className="w-3.5 h-3.5 text-violet-500" />
                        {t("appts_time")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="time"
                          type="time"
                          {...form.register("time")}
                          className={cn(
                            "h-11 rounded-[5px] pl-4 pr-10",
                            "border-neutral-200 dark:border-neutral-800",
                            "focus-visible:ring-violet-500/30 focus-visible:border-violet-400"
                          )}
                        />
                        <Clock
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
                          strokeWidth={2}
                        />
                      </div>
                      {form.formState.errors.time && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {form.formState.errors.time.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="type"
                      className="text-sm font-semibold text-neutral-700 dark:text-neutral-300"
                    >
                      {t("book_type")}
                    </Label>
                    <Select
                      onValueChange={(v) => form.setValue("type", v)}
                      value={selectedType}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full h-11 rounded-[5px] border-neutral-200 dark:border-neutral-800",
                          "bg-white dark:bg-neutral-900/50",
                          "hover:border-violet-300 dark:hover:border-violet-700/50",
                          "focus-visible:ring-violet-500/30"
                        )}
                      >
                        <SelectValue placeholder={t("book_selectType")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-[5px] shadow-xl">
                        {APPOINTMENT_TYPES.map((typeOpt) => (
                          <SelectItem
                            key={typeOpt.value}
                            value={typeOpt.value}
                            className="rounded-[5px] focus:bg-violet-50 dark:focus:bg-violet-950/30"
                          >
                            {apptTypeLabel(typeOpt.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.type && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {form.formState.errors.type.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <DialogFooter
              className={cn(
                "px-6 py-4 gap-3",
                "border-t border-neutral-100 dark:border-neutral-800/80",
                "bg-neutral-50/50 dark:bg-neutral-900/30"
              )}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-[5px] border-neutral-200 dark:border-neutral-700",
                  "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                {t("common_cancel")}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className={cn(
                  "rounded-[5px] px-6",
                  "bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600",
                  "hover:from-violet-700 hover:via-indigo-700 hover:to-violet-700",
                  "text-white shadow-lg shadow-violet-500/25",
                  "hover:shadow-xl hover:shadow-violet-500/30",
                  "transition-all duration-300 active:scale-[0.98]"
                )}
              >
                {form.formState.isSubmitting ? t("book_booking") : t("book_book")}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
