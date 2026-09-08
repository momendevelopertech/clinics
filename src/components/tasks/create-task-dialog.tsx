"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
};

interface CreateTaskDialogProps {
  onSuccess: () => void;
}

const priorities = ["low", "medium", "high", "urgent"];

export function CreateTaskDialog({ onSuccess }: CreateTaskDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    patientId: "",
  });

  React.useEffect(() => {
    if (open) {
      fetch("/api/patients")
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch patients");
          return response.json();
        })
        .then(setPatients)
        .catch((error) => {
          logClientError("Task patient lookup failed", error);
        });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority || null,
          dueDate: formData.dueDate || null,
          patientId: formData.patientId || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");

      toast.success("Task created successfully");
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        patientId: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to create task");
      logClientError("Create task failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Assign a follow-up or clinical task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Call patient about lab results"
            />
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional notes for the assigned staff"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger id="task-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gap-2 flex flex-col">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="task-patient">Patient (optional)</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
            >
              <SelectTrigger id="task-patient">
                <SelectValue placeholder="No patient linked" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}