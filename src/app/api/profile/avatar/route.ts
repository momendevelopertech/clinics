import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgContext, isAuthContextError } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { destroyCloudinaryAssetSafe } from "@/lib/cloudinary";
import { isServerIssuedStorageUrl } from "@/lib/validations/uploads";

const avatarBodySchema = z.object({
  avatarUrl: z
    .string()
    .url()
    .refine(
      isServerIssuedStorageUrl,
      "Avatar URL must be a server-issued Cloudinary URL",
    ),
  publicId: z.string().max(500).optional().nullable(),
});

/**
 * Persist a Cloudinary avatar URL for the currently authenticated staff user.
 */
export async function GET() {
  try {
    const context = await requireOrgContext();
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    if (isAuthContextError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logServerError("Error fetching profile avatar", error);
    return NextResponse.json({ error: "Failed to fetch avatar" }, { status: 500 });
  }
}

/**
 * Persist a Cloudinary avatar URL for the currently authenticated staff user.
 */
export async function PATCH(request: Request) {
  try {
    const context = await requireOrgContext();
    const body = await request.json();
    const parsed = avatarBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid avatar payload" }, { status: 400 });
    }

    const current = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { avatarUrl: true, avatarPublicId: true },
    });

    const updated = await prisma.user.update({
      where: { id: context.userId },
      data: {
        avatarUrl: parsed.data.avatarUrl,
        avatarPublicId: parsed.data.publicId ?? null,
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    // Best-effort cleanup of the replaced avatar asset (never fails the request).
    if (
      current?.avatarPublicId &&
      current.avatarPublicId !== parsed.data.publicId
    ) {
      await destroyCloudinaryAssetSafe(current.avatarPublicId, "image");
    }

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "UPDATE",
      entityType: "UserAvatar",
      entityId: context.userId,
      afterState: JSON.stringify({
        avatarUrl: parsed.data.avatarUrl,
        publicId: parsed.data.publicId ?? null,
      }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isAuthContextError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logServerError("Error updating profile avatar", error);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}
