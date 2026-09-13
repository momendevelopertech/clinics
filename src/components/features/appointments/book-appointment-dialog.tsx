"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  CalendarPlus,
  Clock,
  Stethoscope,
  User,
  X,
} from "lucide-react";;
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

interface BookAppointmentDialogProps {
  patients: Patient[];
  providers: { id: string; name: string }[];
  onBook: (data: {
    patientId: string;
    providerId: string;
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
  providers,
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
    const { provider, ...appointmentData } = data;
    onBook({
      ...appointmentData,
      providerId: provider,
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
          <Button>
            <CalendarDays className="w-4 h-4 mr-2" />
            {t("book_title")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-[440px] p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto",
          "border border-border shadow-lg",
          "bg-card text-card-foreground rounded-lg"
        )}
      >
        <div className="relative">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              {t("book_title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              {t("book_desc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Patient */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="patientId"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-primary" />
                      {t("book_patient")}
                    </Label>
                    <Select
                      onValueChange={(v) => form.setValue("patientId", v)}
                      value={selectedPatientId}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder={t("book_selectPatient")} />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                          >
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.patientId && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.patientId.message}
                      </p>
                    )}
                  </div>

                  {/* Provider */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="provider"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-primary" />
                      {t("appts_provider")}
                    </Label>
                    <Select
                      onValueChange={(v) => form.setValue("provider", v)}
                      value={selectedProvider}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder={t("book_selectProvider")} />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.provider && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.provider.message}
                      </p>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="date"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                      >
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {t("appts_date")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="date"
                          type="date"
                          {...form.register("date")}
                          className="h-9 pr-8"
                        />
                      </div>
                      {form.formState.errors.date && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.date.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="time"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                      >
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {t("appts_time")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="time"
                          type="time"
                          {...form.register("time")}
                          className="h-9 pr-8"
                        />
                      </div>
                      {form.formState.errors.time && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.time.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="type"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {t("book_type")}
                    </Label>
                    <Select
                      onValueChange={(v) => form.setValue("type", v)}
                      value={selectedType}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder={t("book_selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map((typeOpt) => (
                          <SelectItem
                            key={typeOpt.value}
                            value={typeOpt.value}
                          >
                            {apptTypeLabel(typeOpt.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.type && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.type.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                <X className="mr-1.5 h-4 w-4" />{t("common_cancel")}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                <CalendarPlus className="mr-1.5 h-4 w-4" />{form.formState.isSubmitting ? t("book_booking") : t("book_book")}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
