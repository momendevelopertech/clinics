import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireModulePermission } from "@/lib/permissions";
import { availabilityUpdateSchema } from "@/lib/validations/ops";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function PATCH(request: Request) {
  const context = await requireOrgContext().catch(() => null);
  if (!context) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const moduleAuthz = await requireModulePermission(context.organizationId, "availability");
  if (moduleAuthz.response) return moduleAuthz.response;

  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsed = availabilityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid availability", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const availabilityType = parsed.data.availabilityType ?? "regular";
  const rawDays = parsed.data.availableDays ?? [];
  const availableDays = rawDays.join(",");

  const availableFrom = parsed.data.availableFrom ?? "09:00";
  const availableTo = parsed.data.availableTo ?? "17:00";

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