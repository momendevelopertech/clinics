import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { z } from "zod";

const scheduleCreateSchema = z.object({
  dayOfMonth: z.number().int().min(1).max(28).default(1),
  recipients: z.array(z.string().min(1).max(100)).min(1).max(20),
});

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
    const schedules = await prisma.reportSchedule.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(schedules);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

/** Owner-only: register a monthly email schedule. */
export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = scheduleCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const users = await prisma.user.findMany({
      where: {
        id: { in: parsed.data.recipients },
        organizationId: context.organizationId,
        active: true,
      },
      select: { id: true },
    });
    if (users.length !== parsed.data.recipients.length) {
      return NextResponse.json({ error: "One or more recipients are invalid" }, { status: 400 });
    }
    const created = await prisma.reportSchedule.create({
      data: {
        organizationId: context.organizationId,
        frequency: "monthly",
        dayOfMonth: parsed.data.dayOfMonth,
        recipients: JSON.stringify(users.map((u) => u.id)),
        active: true,
      },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "ReportSchedule",
      entityId: created.id,
      afterState: JSON.stringify({ dayOfMonth: created.dayOfMonth }),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logServerError("Error creating report schedule", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}
