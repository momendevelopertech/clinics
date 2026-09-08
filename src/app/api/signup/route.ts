import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  generateOpaqueToken,
  hashToken,
  sendAuthEmail,
  getAppUrl,
} from "@/lib/email";
import { logServerError } from "@/lib/safe-logger";

export const signupSchema = z.object({
  clinicName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  website: z.string().trim().max(120).optional().or(z.literal("")),
  startedAt: z.number().optional(),
  // honeypot: bots fill hidden fields
  company: z.string().max(0).optional().or(z.literal("")),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const OWNER_PERMISSIONS = [
  { action: "patients:read", resource: "patients" },
  { action: "patients:write", resource: "patients" },
  { action: "appointments:read", resource: "appointments" },
  { action: "appointments:write", resource: "appointments" },
  { action: "encounters:read", resource: "encounters" },
  { action: "encounters:write", resource: "encounters" },
  { action: "inventory:read", resource: "inventory" },
  { action: "inventory:write", resource: "inventory" },
  { action: "billing:read", resource: "billing" },
  { action: "billing:write", resource: "billing" },
  { action: "lab:read", resource: "lab" },
  { action: "lab:write", resource: "lab" },
  { action: "pharmacy:read", resource: "pharmacy" },
  { action: "pharmacy:write", resource: "pharmacy" },
  { action: "staff:read", resource: "staff" },
  { action: "staff:write", resource: "staff" },
];

const modulePermissions = (modules: string[]) =>
  modules.map((module) => ({ action: `${module}:read`, resource: module }));

const withModulePermissions = (
  permissions: Array<{ action: string; resource: string }>,
  modules: string[],
) => {
  const all = [...permissions, ...modulePermissions(modules)];
  return all.filter(
    (permission, index) =>
      all.findIndex(
        (candidate) =>
          candidate.action === permission.action &&
          candidate.resource === permission.resource,
      ) === index,
  );
};

const OWNER_MODULES = [
  "dashboard", "patients", "appointments", "queue", "encounters", "analytics",
  "consents", "audit", "labs", "tasks", "documents", "reports", "availability",
  "catalogs", "communications", "locations", "waitlist", "billing", "payments",
  "inventory", "automation", "campaigns", "settings", "plan", "help",
];

const DOCTOR_MODULES = [
  "dashboard", "patients", "appointments", "queue", "encounters", "analytics",
  "consents", "audit", "labs", "tasks", "documents", "reports", "availability",
  "catalogs", "help",
];

const RECEPTIONIST_MODULES = [
  "dashboard", "patients", "appointments", "queue", "consents", "tasks",
  "documents", "communications", "locations", "waitlist", "help",
];

const OWNER_ROLE_PERMISSIONS = withModulePermissions(OWNER_PERMISSIONS, OWNER_MODULES);

const DOCTOR_ROLE_PERMISSIONS = withModulePermissions([
  { action: "patients:read", resource: "patients" },
  { action: "patients:write", resource: "patients" },
  { action: "appointments:read", resource: "appointments" },
  { action: "appointments:write", resource: "appointments" },
  { action: "encounters:read", resource: "encounters" },
  { action: "encounters:write", resource: "encounters" },
  { action: "lab:read", resource: "lab" },
  { action: "lab:write", resource: "lab" },
], DOCTOR_MODULES);

const RECEPTIONIST_ROLE_PERMISSIONS = withModulePermissions([
  { action: "patients:read", resource: "patients" },
  { action: "patients:write", resource: "patients" },
  { action: "appointments:read", resource: "appointments" },
  { action: "appointments:write", resource: "appointments" },
], RECEPTIONIST_MODULES);

async function createDefaultRoles(
  db: Pick<typeof prisma, "role" | "rolePermission">,
  organizationId: string,
) {
  const roles: Array<{ name: string; permissions: Array<{ action: string; resource: string }> }> = [
    { name: "Owner", permissions: OWNER_ROLE_PERMISSIONS },
    { name: "Doctor", permissions: DOCTOR_ROLE_PERMISSIONS },
    // Persist the canonical role name; the UI displays this as Receptionist.
    { name: "Care Coordinator", permissions: RECEPTIONIST_ROLE_PERMISSIONS },
  ];

  const created: Array<{ id: string; name: string }> = [];
  for (const definition of roles) {
    const role = await db.role.create({
      data: { organizationId, name: definition.name },
      select: { id: true, name: true },
    });
    await db.rolePermission.createMany({
      data: definition.permissions.map((permission) => ({
        roleId: role.id,
        action: permission.action,
        resource: permission.resource,
      })),
    });
    created.push(role);
  }
  return created;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Honeypot: legitimate users never fill this hidden field.
    if (data.company) {
      return NextResponse.json({ ok: true, status: "created" }, { status: 201 });
    }

    // Min-fill-time: reject submissions that arrive faster than a human could type.
    if (data.startedAt && Number.isFinite(data.startedAt)) {
      if (Date.now() - data.startedAt < 3000) {
        return NextResponse.json(
          { error: "Please try again." },
          { status: 400 },
        );
      }
    }

    const email = data.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const baseSlug = slugify(data.clinicName) || "clinic";
    let slug = baseSlug;
    for (let attempt = 1; attempt < 20; attempt += 1) {
      const taken = await prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!taken) break;
      slug = `${baseSlug}-${attempt}`;
    }

    const verificationToken = generateOpaqueToken();
    const passwordHash = hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.clinicName,
          slug,
          phone: data.phone || null,
          city: data.city || null,
          country: data.country || null,
          status: "pending",
          plan: "free",
          onboardingSource: "self_serve",
          timezone: "UTC",
          currency: "USD",
          settingsJson: JSON.stringify({ appointmentDurationMins: 30 }),
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          name: data.ownerName,
          passwordHash,
          role: "owner",
          active: true,
          emailVerified: false,
          verifyTokenHash: hashToken(verificationToken),
          verifyTokenExp: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      });

      const roles = await createDefaultRoles(tx, organization.id);
      const ownerRole = roles.find((role) => role.name === "Owner");
      if (ownerRole) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: ownerRole.id },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorType: "system",
          actorIdentifier: "signup",
          action: "CREATE",
          entityType: "Organization",
          entityId: organization.id,
          afterState: JSON.stringify({ name: organization.name, slug }),
        },
      });

      return { organization, user };
    });

    // Send verification email (graceful degradation when no provider is configured).
    const verifyUrl = `${getAppUrl()}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    await sendAuthEmail({
      to: email,
      subject: "Verify your email address",
      body: `Hi ${data.ownerName}, welcome to HealthCRM! Please verify your email address to activate your clinic account.`,
      ctaUrl: verifyUrl,
      ctaLabel: "Verify email",
    });

    return NextResponse.json(
      { ok: true, status: "created", organizationId: result.organization.id },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Signup failed", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}