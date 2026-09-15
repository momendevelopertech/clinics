"use client";

import * as React from "react";
import {
  RefreshCw,
  Repeat2,
  X,
} from "lucide-react";;
import { Button } from "@/components/ui/button";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { Input } from "@/components/ui/input";
import { logClientError } from "@/lib/client-logger";

interface RecurringAppointmentDialogProps {
  appointmentId: string;
  onSuccess: () => void;
}

export function RecurringAppointmentDialog({
  appointmentId,
  onSuccess,
}: RecurringAppointmentDialogProps) {
  const { triggerGuidance } = usePostActionGuidance();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    frequency: "weekly", // daily, weekly, biweekly, monthly
    interval: "1",
    endDate: "",
    occurrences: "",
  });

  const generateRRule = () => {
    const freq = {
      daily: "DAILY",
      weekly: "WEEKLY",
      biweekly: "WEEKLY;INTERVAL=2",
      monthly: "MONTHLY",
    };

    let rrule = `FREQ=${freq[formData.frequency as keyof typeof freq]}`;

    if (formData.occurrences && formData.occurrences !== "") {
      rrule += `;COUNT=${formData.occurrences}`;
    } else if (formData.endDate) {
      const date = new Date(formData.endDate);
      const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
      rrule += `;UNTIL=${dateStr}`;
    }

    return rrule;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.frequency) {
      toast.error("Please select a frequency");
      return;
    }

    if (!formData.endDate && !formData.occurrences) {
      toast.error("Please set either an end date or number of occurrences");
      return;
    }

    try {
      setLoading(true);
      const rrule = generateRRule();

      const response = await fetch(
        `/api/appointments/${appointmentId}/recurrence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isRecurring: true,
            recurrenceRule: rrule,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to set recurrence");

      triggerGuidance("appointment_updated", "Recurrence pattern set successfully");
      setFormData({
        frequency: "weekly",
        interval: "1",
        endDate: "",
        occurrences: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to set recurrence");
      logClientError("Recurring appointment update failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureTip tipId="appointments-recurring">
      <span className="inline-flex">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Repeat2 className="w-4 h-4" /> Recurring
            </Button>
          </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Recurring Pattern</DialogTitle>
          <DialogDescription>
            Configure how often this appointment should repeat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="frequency">Frequency *</Label>
            <SearchableSelect
              value={formData.frequency}
              onValueChange={(value) =>
                setFormData({ ...formData, frequency: value })
              }
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "biweekly", label: "Every 2 Weeks" },
                { value: "monthly", label: "Monthly" },
              ]}
              id="frequency"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="occurrences">Number of Occurrences</Label>
              <Input
                id="occurrences"
                type="number"
                min="1"
                max="52"
                placeholder="e.g., 12"
                value={formData.occurrences}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    occurrences: e.target.value,
                    endDate: "",
                  })
                }
              />
            </div>

            <div className="gap-2 flex flex-col">
              <Label htmlFor="end-date">Or End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endDate: e.target.value,
                    occurrences: "",
                  })
                }
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">Preview:</p>
            <p>{generateRRule()}</p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              <X />Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <RefreshCw />{loading ? "Setting..." : "Set Recurrence"}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
      </span>
    </FeatureTip>
  );
}
