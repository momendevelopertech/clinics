import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { averageMinutes, percentage } from "@/lib/analytics";

function getDateBounds() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { todayStart, tomorrowStart, monthStart, nextMonthStart };
}

export async function GET() {
  const context = await requireOrgContext().catch(() => null);
  if (!context) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { organizationId } = context;

  const authz = await requireAnyPermission(organizationId, [
    { action: "billing:read", resource: "billing" },
    { action: "encounters:read", resource: "encounters" },
  ]);
  if (authz.response) return authz.response;

  const { todayStart, tomorrowStart, monthStart, nextMonthStart } = getDateBounds();

  const [
    activePatients,
    appointmentsToday,
    encountersThisMonth,
    monthlyAppointments,
    completedPayments,
    openInvoices,
  ] = await Promise.all([
    prisma.patient.count({
      where: { organizationId, status: { not: "Archived" } },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId,
        startTime: { gte: todayStart, lt: tomorrowStart },
        status: { not: "cancelled" },
      },
      select: { status: true },
    }),
    prisma.encounter.findMany({
      where: {
        organizationId,
        startTime: { gte: monthStart, lt: nextMonthStart },
        status: "completed",
        endTime: { not: null },
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId,
        startTime: { gte: monthStart, lt: nextMonthStart },
      },
      select: { status: true },
    }),
    prisma.payment.aggregate({
      where: {
        invoice: { organizationId },
        status: "completed",
        createdAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["sent", "partially_paid", "overdue"] },
      },
      select: { totalAmount: true, amountPaid: true },
    }),
  ]);

  const monthlyStatusCounts = monthlyAppointments.reduce<Record<string, number>>(
    (counts, appointment) => {
      counts[appointment.status] = (counts[appointment.status] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const totalMonthlyAppointments = monthlyAppointments.length;
  const completed = monthlyStatusCounts.completed ?? 0;
  const noShows = monthlyStatusCounts.no_show ?? 0;
  const durations = encountersThisMonth.flatMap((encounter) =>
    encounter.endTime
      ? [encounter.endTime.getTime() - encounter.startTime.getTime()]
      : [],
  );
  const outstanding = openInvoices.reduce(
    (total, invoice) =>
      total + Math.max(0, Number(invoice.totalAmount) - Number(invoice.amountPaid)),
    0,
  );

  return NextResponse.json({
    period: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
    kpis: {
      activePatients,
      appointmentsToday: appointmentsToday.length,
      activeAppointmentsToday: appointmentsToday.filter(
        (appointment) => appointment.status !== "completed",
      ).length,
      completedEncountersThisMonth: encountersThisMonth.length,
      averageVisitMinutes: averageMinutes(durations),
      monthlyCompletionRate: percentage(completed, totalMonthlyAppointments),
      monthlyNoShowRate: percentage(noShows, totalMonthlyAppointments),
      revenueThisMonth: Number(completedPayments._sum.amount ?? 0),
      outstandingBalance: outstanding,
    },
  });
}

