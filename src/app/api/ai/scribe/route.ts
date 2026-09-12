import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { completeChat, isAiEnabled } from "@/lib/ai";
import { buildScribePrompt, parseScribeResponse } from "@/lib/ai-clinical";
import { z } from "zod";

const scribeSchema = z.object({
  transcript: z.string().min(5).max(20_000),
});

/**
 * POST /api/ai/scribe — converts raw clinical dictation into a SOAP note.
 * Returns 503 { enabled:false } when no AI provider is configured (fail-closed).
 */
export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    if (!isAiEnabled()) {
      return NextResponse.json(
        { ok: false, enabled: false, error: "AI provider is not configured" },
        { status: 503 },
      );
    }

    const parsed = scribeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
    }

    const result = await completeChat(buildScribePrompt(parsed.data.transcript));
    if (!result.ok) {
      return NextResponse.json({ ok: false, enabled: true, error: result.error }, { status: 502 });
    }

    const soap = parseScribeResponse(result.content);

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "AiScribe",
      entityId: "transcript",
      afterState: JSON.stringify({
        chars: parsed.data.transcript.length,
        filled: Object.values(soap).filter(Boolean).length,
      }),
    });

    return NextResponse.json({ ok: true, enabled: true, soap });
  } catch (error) {
    logServerError("AI scribe failed", error);
    return NextResponse.json({ error: "AI scribe failed" }, { status: 500 });
  }
}