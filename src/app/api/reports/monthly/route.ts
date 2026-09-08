import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";

function monthBounds(month?: string | null) {
  const now = new Date();
  let year = now.getFullYear();
  let m = now.getMonth();

  if (month) {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (match) {
      const y = Number(match[1]);
      const mo = Number(match[2]) - 1;
      if (mo >= 0 && mo <= 11 && y >= 2000) {
        year = y;
        m = mo;
      }
    }
  }

  const start = new Date(year, m, 1);
  const end = new Date(year, m + 1, 1);
  return { start, end };
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const { start, end } = monthBounds(searchParams.get("month"));

  const [appointments, payments, invoiceAgg, perDayRows, perDoctorRows] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { organizationId, startTime: { gte: start, lt: end } },
        select: { status: true },
      }),
      prisma.payment.aggregate({
        where: {
          invoice: { organizationId },
          status: "completed",
          createdAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ["sent", "partially_paid", "overdue"] },
          createdAt: { gte: start, lt: end },
        },
        select: { totalAmount: true, amountPaid: true },
      }),
      prisma.$queryRaw`
        SELECT CAST(DATE("startTime") AS TEXT) AS day, COUNT(*)::int AS total
        FROM "Appointment"
        WHERE "organizationId" = ${organizationId}
          AND "startTime" >= ${start} AND "startTime" < ${end}
        GROUP BY DATE("startTime")
        ORDER BY DATE("startTime")
      `,
      prisma.$queryRaw`
        SELECT u.name AS name, COUNT(a.id)::int AS appointments
        FROM "Appointment" a
        JOIN "User" u ON u.id = a."providerId"
        WHERE a."organizationId" = ${organizationId}
          AND a."startTime" >= ${start} AND a."startTime" < ${end}
        GROUP BY u.name
        ORDER BY appointments DESC
      `,
    ]);

  const statusCounts: Record<string, number> = {};
  for (const appointment of appointments) {
    statusCounts[appointment.status] = (statusCounts[appointment.status] ?? 0) + 1;
  }

  const completed = statusCounts["completed"] ?? 0;
  const cancelled = statusCounts["cancelled"] ?? 0;
  const noShow = statusCounts["no_show"] ?? 0;
  const totalAppointments = appointments.length;
  const completionRate =
    totalAppointments === 0 ? 0 : Math.round((completed / totalAppointments) * 100);

  const revenue = Number(payments._sum.amount ?? 0);
  const outstanding = invoiceAgg.reduce(
    (sum, invoice) =>
      sum + Math.max(0, Number(invoice.totalAmount) - Number(invoice.amountPaid)),
    0,
  );

  const perDay = (perDayRows as Array<{ day: string; total: number }>).map((row) => ({
    day: row.day,
    total: row.total,
  }));

  const perDoctor = (
    perDoctorRows as Array<{ name: string | null; appointments: number }>
  ).map((row) => ({
    name: row.name ?? "Unassigned",
    appointments: row.appointments,
  }));

  return NextResponse.json({
    month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    summary: {
      totalAppointments,
      completed,
      cancelled,
      noShow,
      completionRate,
      revenue,
      outstanding,
    },
    perDay,
    perDoctor,
  });
}