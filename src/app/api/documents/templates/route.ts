import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { TEMPLATE_REGISTRY } from "@/lib/documents/templates";

/** GET /api/documents/templates — printable server-PDF template catalog. */
export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "documents");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    return NextResponse.json(
      TEMPLATE_REGISTRY.map((t) => ({
        id: t.id,
        docType: t.docType,
        requiredFields: t.requiredFields,
        needsLabOrder: t.needsLabOrder,
      })),
    );
  } catch (error) {
    logServerError("Error listing document templates", error);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}
