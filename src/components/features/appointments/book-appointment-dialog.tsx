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
  UserPlus,
  X,
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale/locale-provider";

import type { Appointment, Patient } from "@/context/MedicalContext";
import { useMedical } from "@/context/MedicalContext";

const buildBookAppointmentSchema = (t: (key: string) => string) =>
  z.object({
    patientId: z.string().min(1, t("book_requirePatient")),
    provider: z.string().min(1, t("book_requireProvider")),
    date: z.string().min(1, t("book_requireDate")),
    time: z.string().min(1, t("book_requireTime")),
    type: z.string().min(1, t("book_requireType")),
    duration: z.string(),
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

const DURATION_OPTIONS = ["15 min", "30 min", "45 min", "60 min"];

const parseDurationMinutes = (duration?: string | null) => {
  const minutes = Number.parseInt(duration ?? "", 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
};

const parseTimeMinutes = (time?: string | null) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

interface BookAppointmentDialogProps {
  patients: Patient[];
  providers: { id: string; name: string }[];
  appointments?: Appointment[];
  initialPatientId?: string;
  onBook: (data: {
    patientId: string;
    providerId: string;
    date: string;
    time: string;
    type: string;
    duration: string;
    status: string;
    isWalkIn: boolean;
  }) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BookAppointmentDialog({
  patients,
  providers,
  appointments: appointmentsProp,
  initialPatientId,
  onBook,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: BookAppointmentDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [walkIn, setWalkIn] = React.useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;

  const { t } = useLocale();
  const { appointments: contextAppointments } = useMedical();
  const appointments = appointmentsProp ?? contextAppointments;

  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0], []);

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
      duration: "30 min",
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
  const selectedDate = useWatch({
    control: form.control,
    name: "date",
  });
  const selectedTime = useWatch({
    control: form.control,
    name: "time",
  });
  const selectedDuration = useWatch({
    control: form.control,
    name: "duration",
  });

  React.useEffect(() => {
    if (open && initialPatientId) {
      form.setValue("patientId", initialPatientId);
    }
  }, [open, initialPatientId, form]);

  const hasConflict = React.useMemo(() => {
    const start = parseTimeMinutes(selectedTime);
    if (!selectedProvider || !selectedDate || start === null) return false;
    const duration = parseDurationMinutes(selectedDuration);
    const end = start + duration;
    return appointments.some((appointment) => {
      if (appointment.providerId !== selectedProvider) return false;
      if (appointment.date !== selectedDate) return false;
      const status = appointment.status?.toLowerCase();
      if (status === "cancelled") return false;
      const existingStart = parseTimeMinutes(appointment.time);
      if (existingStart === null) return false;
      const existingEnd = existingStart + parseDurationMinutes(appointment.duration);
      return start < existingEnd && existingStart < end;
    });
  }, [appointments, selectedProvider, selectedDate, selectedTime, selectedDuration]);

  const onSubmit = (data: BookAppointmentFormValues) => {
    const { provider, ...appointmentData } = data;
    onBook({
      ...appointmentData,
      providerId: provider,
      duration: data.duration || "30 min",
      status: walkIn ? "arrived" : "Scheduled",
      isWalkIn: walkIn,
    });
    setOpen(false);
    form.reset();
    toast.success(walkIn ? t("book_walkInSuccess") : t("book_success"));
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
                    <SearchableSelect
                      value={selectedPatientId}
                      onValueChange={(v) => form.setValue("patientId", v)}
                      options={patients.map((p) => ({
                        value: p.id,
                        label: `${p.firstName} ${p.lastName}`,
                      }))}
                      placeholder={t("book_selectPatient")}
                      triggerClassName="w-full h-9"
                    />
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
                    <SearchableSelect
                      value={selectedProvider}
                      onValueChange={(v) => form.setValue("provider", v)}
                      options={providers.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder={t("book_selectProvider")}
                      triggerClassName="w-full h-9"
                    />
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
                          min={todayStr}
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

                  {/* Walk-in */}
                  <label className="flex items-start gap-3 rounded-md border border-border bg-muted-bg/50 p-3 cursor-pointer">
                    <Checkbox
                      checked={walkIn}
                      onCheckedChange={(checked) => setWalkIn(checked === true)}
                      aria-label={t("book_walkIn")}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <UserPlus className="h-3.5 w-3.5 text-primary" />
                        {t("book_walkIn")}
                      </span>
                      <span className="text-[11px] leading-4 text-muted-foreground">
                        {t("book_walkInHint")}
                      </span>
                    </span>
                  </label>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="type"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {t("book_type")}
                    </Label>
                    <SearchableSelect
                      value={selectedType}
                      onValueChange={(v) => form.setValue("type", v)}
                      options={APPOINTMENT_TYPES.map((typeOpt) => ({
                        value: typeOpt.value,
                        label: apptTypeLabel(typeOpt.value),
                      }))}
                      placeholder={t("book_selectType")}
                      triggerClassName="w-full h-9"
                    />
                    {form.formState.errors.type && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.type.message}
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="duration"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {t("rx_duration")}
                    </Label>
                    <SearchableSelect
                      value={selectedDuration}
                      onValueChange={(v) => form.setValue("duration", v)}
                      options={DURATION_OPTIONS.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                      placeholder={t("rx_duration")}
                      triggerClassName="w-full h-9"
                    />
                  </div>

                  {hasConflict ? (
                    <p className="text-xs font-semibold text-warning-text">
                      {t("appt_conflict")}
                    </p>
                  ) : null}
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
