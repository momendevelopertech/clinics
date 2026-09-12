import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { buildMonthlyCsv, isScheduleDue, type ServiceRow } from "@/lib/report-export";
import { netProfit } from "@/lib/analytics";

function monthBounds(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end, label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` };
}

async function sendMonthlyCsv(to: string, subject: string, csv: string): Promise<boolean> {
  if ((process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase() !== "smtp") return false;
  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "HealthCRM <no-reply@healthcrm.local>",
    to,
    subject,
    text: "Your scheduled monthly clinic report is attached.",
    attachments: [{ filename: "monthly-report.csv", content: csv, contentType: "text/csv" }],
  });
  return true;
}

/**
 * CRON POST /api/reports/scheduled — monthly email digests. Sends the
 * previous month's CSV to each due schedule's staff recipients (SMTP only;
 * without it the run reports skipped, never sent) and stamps lastSentAt so
 * each schedule fires at most once per month.
 */
export async function POST(request: NextRequest) {
  try {
    const cronAuth = authorizeCronRequest(request);
    if (!cronAuth.ok) return cronAuth.response;

    const now = new Date();
    const schedules = await prisma.reportSchedule.findMany({
      where: { active: true, frequency: "monthly" },
    });
    let sent = 0;
    let skipped = 0;

    for (const schedule of schedules) {
      if (!isScheduleDue(schedule, now)) continue;
      const org = await prisma.organization.findUnique({
        where: { id: schedule.organizationId },
        select: { status: true },
      });
      if (org?.status !== "active") continue;

      const { start, end, label } = monthBounds(now);
      const [appointments, payments, paymentsRefunded, invoiceAgg, expensesAgg, perDoctorRows] =
        await Promise.all([
          prisma.appointment.findMany({
            where: {
              organizationId: schedule.organizationId,
              startTime: { gte: start, lt: end },
            },
            select: { status: true },
          }),
          prisma.payment.aggregate({
            where: { invoice: { organizationId: schedule.organizationId }, status: "completed", createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          prisma.payment.aggregate({
            where: { invoice: { organizationId: schedule.organizationId }, status: "completed", refundedAmount: { gt: 0 }, createdAt: { gte: start, lt: end } },
            _sum: { refundedAmount: true },
          }),
          prisma.invoice.findMany({
            where: { organizationId: schedule.organizationId, status: { in: ["sent", "partially_paid", "overdue"] }, createdAt: { gte: start, lt: end } },
            select: { totalAmount: true, amountPaid: true },
          }),
          prisma.expense.aggregate({
            where: { organizationId: schedule.organizationId, spentAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          prisma.$queryRaw`
            SELECT u.name AS name, COUNT(a.id)::int AS appointments
            FROM "Appointment" a
            JOIN "User" u ON u.id = a."providerId"
            WHERE a."organizationId" = ${schedule.organizationId}
              AND a."startTime" >= ${start} AND a."startTime" < ${end}
            GROUP BY u.name
            ORDER BY appointments DESC
          `,
        ]);
      const revenue =
        Number(payments._sum.amount ?? 0) - Number(paymentsRefunded._sum.refundedAmount ?? 0);
      const expenses = Number(expensesAgg._sum.amount ?? 0);
      const statusCounts: Record<string, number> = {};
      for (const appointment of appointments) {
        statusCounts[appointment.status] = (statusCounts[appointment.status] ?? 0) + 1;
      }
      const totalAppointments = appointments.length;
      const completed = statusCounts["completed"] ?? 0;
      const cancelled = statusCounts["cancelled"] ?? 0;
      const noShow = statusCounts["no_show"] ?? 0;
      const completionRate =
        totalAppointments === 0 ? 0 : Math.round((completed / totalAppointments) * 100);
      const outstanding = invoiceAgg.reduce(
        (s, i) => s + Math.max(0, Number(i.totalAmount) - Number(i.amountPaid)),
        0,
      );
      const perService: ServiceRow[] = (
        perDoctorRows as Array<{ name: string | null; appointments: number }>
      ).map((row) => ({
        name: `Dr. ${row.name ?? "Unassigned"}`,
        count: row.appointments,
        revenue: 0,
      }));
      const csv = buildMonthlyCsv(
        label,
        {
          totalAppointments,
          completed,
          cancelled,
          noShow,
          completionRate,
          revenue,
          expenses,
          net: netProfit(revenue, expenses),
          outstanding,
        },
        perService,
      );

      let recipients: string[] = [];
      try {
        const parsed: unknown = JSON.parse(schedule.recipients);
        if (Array.isArray(parsed)) recipients = parsed.filter((x): x is string => typeof x === "string");
      } catch {
        recipients = [];
      }
      const users = await prisma.user.findMany({
        where: { id: { in: recipients }, organizationId: schedule.organizationId, active: true },
        select: { email: true },
      });
      let delivered = 0;
      for (const u of users) {
        if (!u.email) continue;
        try {
          if (await sendMonthlyCsv(u.email, `Monthly clinic report — ${label}`, csv)) delivered += 1;
        } catch (error) {
          logServerError("Scheduled report email failed", error);
        }
      }
      if (delivered > 0) {
        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: { lastSentAt: now },
        });
        sent += 1;
      } else {
        skipped += 1;
      }
    }
    return NextResponse.json({ ok: true, sent, skipped });
  } catch (error) {
    logServerError("Scheduled reports cron failed", error);
    return NextResponse.json({ error: "Scheduled reports failed" }, { status: 500 });
  }
}
