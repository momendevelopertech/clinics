import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/roles";
import { z } from "zod";

const platformSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  allowClinicSignups: z.boolean().optional(),
  defaultPlan: z.enum(["free", "clinic", "plus"]).optional(),
  supportEmail: z.string().max(200).optional(),
  announcement: z.string().max(500).optional(),
});

type PlatformSettings = {
  maintenanceMode?: boolean;
  allowClinicSignups?: boolean;
  defaultPlan?: string;
  supportEmail?: string;
  announcement?: string;
};

async function getPlatformOrganization(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!user) return null;
  return prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { id: true, settingsJson: true },
  });
}

function readSettings(settingsJson: string | null): PlatformSettings {
  if (!settingsJson) return {};
  try {
    const parsed = JSON.parse(settingsJson) as { platform?: PlatformSettings };
    return parsed.platform ?? {};
  } catch {
    return {};
  }
}

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }
  const organization = await getPlatformOrganization(guard.userId);
  if (!organization) {
    return NextResponse.json({ error: "Platform organization not found" }, { status: 404 });
  }
  return NextResponse.json({ settings: readSettings(organization.settingsJson) });
}

export async function PUT(request: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const organization = await getPlatformOrganization(guard.userId);
  if (!organization) {
    return NextResponse.json({ error: "Platform organization not found" }, { status: 404 });
  }

  const raw = await request.json().catch(() => ({}));
  const incomingCandidate =
    raw && typeof raw === "object" && "settings" in raw && raw.settings && typeof raw.settings === "object"
      ? raw.settings
      : raw;
  const parsed = platformSettingsSchema.safeParse(incomingCandidate);
  if (!parsed.success) {
    return NextResponse.json({ error: "settings is required" }, { status: 400 });
  }
  const incoming = parsed.data;

  const currentJson = organization.settingsJson
    ? (() => {
        try {
          return JSON.parse(organization.settingsJson) as Record<string, unknown>;
        } catch {
          return {};
        }
      })()
    : {};
  const before = readSettings(organization.settingsJson);
  const settings = {
    maintenanceMode: Boolean(incoming.maintenanceMode),
    allowClinicSignups: incoming.allowClinicSignups !== false,
    defaultPlan:
      incoming.defaultPlan === "clinic" || incoming.defaultPlan === "plus"
        ? incoming.defaultPlan
        : "free",
    supportEmail: String(incoming.supportEmail ?? "").slice(0, 200),
    announcement: String(incoming.announcement ?? "").slice(0, 500),
  } satisfies PlatformSettings;

  await prisma.organization.update({
    where: { id: organization.id },
    data: { settingsJson: JSON.stringify({ ...currentJson, platform: settings }) },
  });
  await createAuditLog({
    organizationId: organization.id,
    userId: guard.userId,
    action: "UPDATE",
    entityType: "platform_settings",
    entityId: organization.id,
    beforeState: JSON.stringify(before),
    afterState: JSON.stringify(settings),
    request,
  });

  return NextResponse.json({ ok: true, settings });
}

export const PATCH = PUT;
