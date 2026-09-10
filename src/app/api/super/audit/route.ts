import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { z } from "zod";

const superAuditQuerySchema = z.object({
  entityType: z.string().trim().max(80).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).optional().nullable(),
});

export async function GET(request: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const { searchParams } = new URL(request.url);
  const parsed = superAuditQuerySchema.safeParse({
    entityType: searchParams.get("entityType"),
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const limit = parsed.data.limit ?? 50;
  const entityType = parsed.data.entityType;

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType:
        entityType && entityType.startsWith("platform_")
          ? entityType
          : { startsWith: "platform_" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ logs });
}
