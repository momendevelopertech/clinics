import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { buildAutomationSignals } from "@/lib/automation";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";

export async function GET() {
  const context = await requireOrgContext().catch(() => null);
  if (!context) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { organizationId } = context;
  const moduleAuthz = await requireModulePermission(organizationId, "automation");
  if (moduleAuthz.response) return moduleAuthz.response;
  const planAuthz = await requireModuleEntitlement(organizationId, "automation");
  if (!planAuthz.ok) return planAuthz.response;
  const now = new Date();
  const recentStart = new Date(now);
  recentStart.setDate(recentStart.getDate() - 30);

  const [followUps, labs, noShows] = await Promise.all([
    prisma.followUp.findMany({
      where: { organizationId, dueDate: { lt: now }, status: { in: ["planned", "overdue"] } },
      orderBy: { dueDate: "asc" },
      take: 25,
      select: {
        id: true,
        patientId: true,
        reason: true,
        dueDate: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.labResult.findMany({
      where: { organizationId, status: "abnormal", reviewedAt: null },
      orderBy: { createdAt: "asc" },
      take: 25,
      select: {
        id: true,
        patientId: true,
        testName: true,
        createdAt: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId,
        status: "no_show",
        startTime: { gte: recentStart, lt: now },
      },
      orderBy: { startTime: "desc" },
      take: 25,
      select: {
        id: true,
        patientId: true,
        startTime: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const signals = buildAutomationSignals({
    overdueFollowUps: followUps.map((item) => ({
      ...item,
      patientName: `${item.patient.firstName} ${item.patient.lastName}`,
    })),
    unreviewedAbnormalLabs: labs.map((item) => ({
      ...item,
      patientName: `${item.patient.firstName} ${item.patient.lastName}`,
    })),
    recentNoShows: noShows.map((item) => ({
      ...item,
      patientName: `${item.patient.firstName} ${item.patient.lastName}`,
    })),
  });

  return NextResponse.json({
    generatedAt: now.toISOString(),
    readOnly: true,
    signals,
  });
}
