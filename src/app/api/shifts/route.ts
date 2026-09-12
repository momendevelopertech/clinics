import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { shiftCreateSchema } from "@/lib/validations/staff";
import { findShiftConflict } from "@/lib/shifts";

export async function GET(request: Request) {
  try {
    const { organizationId } = await requireOrgContext();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const branchId = searchParams.get("branchId");
    const shifts = await prisma.shift.findMany({
      where: {
        organizationId,
        ...(userId ? { userId } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(shifts);
  } catch (error) {
    logServerError("Error fetching shifts", error);
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = shiftCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid shift", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { userId, branchId, weekday, startTime, endTime, note } = parsed.data;
    const [user, branch] = await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, organizationId: context.organizationId, active: true },
        select: { id: true },
      }),
      branchId
        ? prisma.branch.findFirst({
            where: { id: branchId, organizationId: context.organizationId },
            select: { id: true },
          })
        : Promise.resolve({ id: branchId ?? null }),
    ]);
    if (!user) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    if (branchId && !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }
    // Conflict check + insert run in one SERIALIZABLE transaction so two
    // concurrent creations cannot both pass the overlap check. A lost race
    // surfaces as a P2034 serialization failure -> 409.
    let shift;
    try {
      shift = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const existing = await tx.shift.findMany({
            where: { organizationId: context.organizationId, userId, weekday },
            select: { userId: true, weekday: true, startTime: true, endTime: true },
          });
          if (findShiftConflict(existing, { userId, weekday, startTime, endTime })) {
            return null;
          }
          return tx.shift.create({
            data: {
              organizationId: context.organizationId,
              userId,
              branchId: branchId ?? null,
              weekday,
              startTime,
              endTime,
              note: note || null,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        return NextResponse.json({ error: "Shift overlaps an existing shift" }, { status: 409 });
      }
      throw error;
    }

    if (!shift) {
      return NextResponse.json({ error: "Shift overlaps an existing shift" }, { status: 409 });
    }

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "Shift",
      entityId: shift.id,
      afterState: JSON.stringify({ userId, weekday, startTime, endTime }),
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    logServerError("Error creating shift", error);
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}
