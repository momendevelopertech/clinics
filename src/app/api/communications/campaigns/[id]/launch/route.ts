import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import {
  renderApprovedCampaignTemplate,
  sendSMS,
  sendWhatsApp,
} from "@/lib/communications";
import { logServerError } from "@/lib/safe-logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const moduleAuthz = await requireModulePermission(orgId, "campaigns");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "campaigns");
    if (!planAuthz.ok) return planAuthz.response;

    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const body = await request.json().catch(() => ({}));
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // A campaign can be launched only from draft; re-launching an active
    // campaign would re-send to everyone (no dedupe).
    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft campaigns can be launched" },
        { status: 409 },
      );
    }

    const customerIds = Array.isArray(body.patientIds) ? body.patientIds : null;
    const targetChannel = body.channel === "sms" ? "sms" : "whatsapp";
    const templateKey = body.templateKey || campaign.triggerType || "welcome";

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    const patients = await prisma.patient.findMany({
      where: {
        organizationId: orgId,
        marketingOptOut: false,
        ...(customerIds && customerIds.length > 0 ? { id: { in: customerIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    const selectedChannel = targetChannel === "sms" ? "sms" : "whatsapp";

    if (patients.length === 0) {
      return NextResponse.json({ error: "No eligible patients found" }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;

    for (const patient of patients) {
      const phone = patient.phone || "";
      const channel = selectedChannel;
      const content = renderApprovedCampaignTemplate(
        templateKey,
        `${patient.firstName || "Patient"} ${patient.lastName || ""}`.trim() || "Patient",
        org?.name || "Clinic",
        campaign.name,
      );

      if ((channel === "sms" || channel === "whatsapp") && !phone) {
        failed += 1;
        continue;
      }

      const communication = await prisma.communication.create({
        data: {
          organizationId: orgId,
          patientId: patient.id,
          channel,
          type: "campaign",
          content,
          status: "pending",
        },
      });

      try {
        const result =
          channel === "sms"
            ? await sendSMS(phone, content)
            : await sendWhatsApp(phone, content);

        const status = result?.success === true ? "sent" : "failed";
        await prisma.communication.update({
          where: { id: communication.id },
          data: {
            status,
            sentAt: status === "sent" ? new Date() : communication.sentAt,
          },
        });

        if (status === "sent") {
          sent += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        await prisma.communication.update({
          where: { id: communication.id },
          data: { status: "failed" },
        });
        failed += 1;
        logServerError("Campaign send failed", error);
      }
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "active" },
    });

    await createAuditLog({
      organizationId: orgId,
      userId: authz.userId,
      action: "UPDATE",
      entityType: "Campaign",
      entityId: id,
      afterState: JSON.stringify({ status: "active", sent, failed, launchedAt: new Date().toISOString() }),
    });

    return NextResponse.json({
      ok: true,
      campaignId: id,
      sent,
      failed,
      total: patients.length,
      channel: selectedChannel,
      templateKey,
    });
  } catch (error) {
    logServerError("POST /api/communications/campaigns/[id]/launch error", error);
    return NextResponse.json(
      { error: "Failed to launch campaign" },
      { status: 500 },
    );
  }
}
