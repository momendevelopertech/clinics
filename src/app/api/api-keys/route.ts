import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/roles";
import { requireOrgContext } from "@/lib/org";
import { mintApiKey } from "@/lib/api-keys";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  scopes: z.array(z.string()).default(["fhir:write"]),
});

const ALLOWED_SCOPES = new Set(["fhir:write"]);

/**
 * Machine API key management (Owner only). The full key is returned exactly
 * once — only a SHA-256 hash + lookup prefix are stored.
 */
export async function GET() {
  try {
    const owner = await requireOwner({ json: true }).catch(() => null);
    if (!owner?.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { organizationId } = await requireOrgContext();
    const keys = await prisma.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        active: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      keys: keys.map((key) => ({
        ...key,
        scopes: JSON.parse(key.scopes) as string[],
      })),
    });
  } catch (error) {
    logServerError("Failed to list API keys", error);
    return NextResponse.json({ error: "Failed to list API keys" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner({ json: true }).catch(() => null);
    if (!owner?.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const context = await requireOrgContext();
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const scopes = parsed.data.scopes.filter((scope) => ALLOWED_SCOPES.has(scope));
    const minted = mintApiKey(parsed.data.name, scopes);

    const key = await prisma.apiKey.create({
      data: {
        organizationId: context.organizationId,
        name: parsed.data.name,
        prefix: minted.prefix,
        keyHash: minted.keyHash,
        scopes: JSON.stringify(scopes),
      },
      select: { id: true, name: true, prefix: true, scopes: true, createdAt: true },
    });

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "ApiKey",
      entityId: key.id,
      afterState: JSON.stringify({ name: key.name }),
    });

    return NextResponse.json(
      { key, apiKey: minted.fullKey, message: "Store this key now; it will not be shown again." },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Failed to create API key", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}