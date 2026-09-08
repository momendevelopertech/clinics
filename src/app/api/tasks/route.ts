import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
      { action: "appointments:read", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assigneeId");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        ...(assigneeId ? { assigneeId } : {}),
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        assignee: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    logServerError("Error fetching tasks", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      patientId,
      assigneeId,
      taskType,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const t = await tx.task.create({
        data: {
          organizationId: orgId,
          title: String(title),
          description: description || null,
          status: status || "open",
          priority: priority || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          patientId: patientId || null,
          assigneeId: assigneeId || null,
          creatorId: userId,
          taskType: taskType || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "Task",
          entityId: t.id,
          afterState: JSON.stringify(t),
        },
      });

      return t;
      },
    );

    const withRelations = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        assignee: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    return NextResponse.json(withRelations ?? task, { status: 201 });
  } catch (error) {
    logServerError("Error creating task", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
