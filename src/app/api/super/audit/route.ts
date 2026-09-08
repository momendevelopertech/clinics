import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";

export async function GET(request: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50) || 50, 1), 100);
  const entityType = searchParams.get("entityType");

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
