import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PATCH(request: Request) {
  const context = await requireOrgContext().catch(() => null);
  if (!context) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const moduleAuthz = await requireModulePermission(context.organizationId, "availability");
  if (moduleAuthz.response) return moduleAuthz.response;

  const body = (await request.json().catch(() => ({}))) as {
    availabilityType?: string;
    availableDays?: string[];
    availableFrom?: string;
    availableTo?: string;
  };

  const availabilityType = body.availabilityType ?? "regular";
  if (!["regular", "oncall", "by_appointment"].includes(availabilityType)) {
    return NextResponse.json({ error: "Invalid availability type" }, { status: 400 });
  }

  const rawDays = body.availableDays ?? [];
  const availableDays = rawDays
    .filter((day) => (DAY_KEYS as readonly string[]).includes(day))
    .join(",");

  const availableFrom = body.availableFrom ?? "09:00";
  const availableTo = body.availableTo ?? "17:00";
  if (!TIME_RE.test(availableFrom) || !TIME_RE.test(availableTo)) {
    return NextResponse.json({ error: "Invalid time window" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: context.userId },
    data: {
      availabilityType,
      availableDays: availableDays || null,
      availableFrom,
      availableTo,
    },
    select: {
      id: true,
      availabilityType: true,
      availableDays: true,
      availableFrom: true,
      availableTo: true,
    },
  });

  await createAuditLog({
    organizationId: context.organizationId,
    userId: context.userId,
    action: "UPDATE",
    entityType: "user_availability",
    entityId: context.userId,
    afterState: JSON.stringify(updated),
  });

  return NextResponse.json({ ok: true, availability: updated });
}