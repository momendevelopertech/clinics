export type AutomationSignal = {
  id: string;
  kind: "follow_up" | "lab_review" | "no_show";
  priority: "high" | "medium";
  patientId: string;
  patientName: string;
  title: string;
  detail: string;
  href: string;
  dueAt: string;
};

export function buildAutomationSignals(input: {
  overdueFollowUps: Array<{
    id: string;
    patientId: string;
    patientName: string;
    reason: string;
    dueDate: Date;
  }>;
  unreviewedAbnormalLabs: Array<{
    id: string;
    patientId: string;
    patientName: string;
    testName: string;
    createdAt: Date;
  }>;
  recentNoShows: Array<{
    id: string;
    patientId: string;
    patientName: string;
    startTime: Date;
  }>;
}): AutomationSignal[] {
  return [
    ...input.unreviewedAbnormalLabs.map((lab) => ({
      id: `lab-${lab.id}`,
      kind: "lab_review" as const,
      priority: "high" as const,
      patientId: lab.patientId,
      patientName: lab.patientName,
      title: "Review abnormal result",
      detail: lab.testName,
      href: `/patients/${lab.patientId}`,
      dueAt: lab.createdAt.toISOString(),
    })),
    ...input.overdueFollowUps.map((followUp) => ({
      id: `follow-up-${followUp.id}`,
      kind: "follow_up" as const,
      priority: "medium" as const,
      patientId: followUp.patientId,
      patientName: followUp.patientName,
      title: "Follow-up is overdue",
      detail: followUp.reason,
      href: `/patients/${followUp.patientId}`,
      dueAt: followUp.dueDate.toISOString(),
    })),
    ...input.recentNoShows.map((appointment) => ({
      id: `no-show-${appointment.id}`,
      kind: "no_show" as const,
      priority: "medium" as const,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      title: "Consider a patient outreach",
      detail: "Recent missed appointment",
      href: `/patients/${appointment.patientId}`,
      dueAt: appointment.startTime.toISOString(),
    })),
  ].slice(0, 50);
}

