import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import { sendSMS, sendEmail, sendWhatsApp } from "@/lib/communications";
import { logServerError } from "@/lib/safe-logger";

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "communications");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "communications");
    if (!planAuthz.ok) return planAuthz.response;

    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const channel = searchParams.get("channel");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const communications = await prisma.communication.findMany({
      where: {
        organizationId: orgId,
        ...(patientId && { patientId }),
        ...(channel && { channel }),
        ...(type && { type }),
        ...(status && { status }),
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(communications);
  } catch (error) {
    logServerError("GET /api/communications error", error);
    return NextResponse.json(
      { error: "Failed to fetch communications" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "communications");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "communications");
    if (!planAuthz.ok) return planAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const { patientId, channel, type, content, scheduledFor } = body;

    // Validate input
    if (!patientId || !channel || !type || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!["sms", "email", "whatsapp"].includes(channel)) {
      return NextResponse.json(
        { error: "Channel must be sms, email, or whatsapp" },
        { status: 400 },
      );
    }

    // Verify patient exists in org
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.organizationId !== orgId) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Create communication record
    const communication = await prisma.communication.create({
      data: {
        organizationId: orgId,
        patientId,
        channel,
        type,
        content,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? "scheduled" : "pending",
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Send immediately if not scheduled
    let finalCommunication = communication;
    if (!scheduledFor && channel !== "in_app") {
      try {
        let sendResult = null;
        let sendSuccess = false;

        // Validate contact existence and send
        if (channel === "sms") {
          if (!patient.phone) {
            // Mark as failed if no phone
            finalCommunication = await prisma.communication.update({
              where: { id: communication.id },
              data: { status: "failed" },
              include: {
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            });
          } else {
            sendResult = await sendSMS(patient.phone, content);
            sendSuccess = sendResult?.success === true;
          }
        } else if (channel === "email") {
          if (!patient.email) {
            // Mark as failed if no email
            finalCommunication = await prisma.communication.update({
              where: { id: communication.id },
              data: { status: "failed" },
              include: {
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            });
          } else {
            sendResult = await sendEmail(
              patient.email,
              type === "reminder" ? "Appointment Reminder" : type,
              content,
            );
            sendSuccess = sendResult?.success === true;
          }
        } else if (channel === "whatsapp") {
          if (!patient.phone) {
            // Mark as failed if no phone
            finalCommunication = await prisma.communication.update({
              where: { id: communication.id },
              data: { status: "failed" },
              include: {
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            });
          } else {
            sendResult = await sendWhatsApp(patient.phone, content);
            sendSuccess = sendResult?.success === true;
          }
        }

        // Update status based on send result
        if (sendSuccess) {
          finalCommunication = await prisma.communication.update({
            where: { id: communication.id },
            data: {
              status: "sent",
              sentAt: new Date(),
            },
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          });
        } else if (sendResult && !sendSuccess) {
          finalCommunication = await prisma.communication.update({
            where: { id: communication.id },
            data: { status: "failed" },
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          });
        }
      } catch (sendError) {
        logServerError("Failed to send communication", sendError);
        finalCommunication = await prisma.communication.update({
          where: { id: communication.id },
          data: { status: "failed" },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        });
      }
    }

    // Audit log (fire-and-forget, best-effort)
    createAuditLog({
      userId,
      organizationId: orgId,
      action: "CREATE",
      entityType: "Communication",
      entityId: communication.id,
      afterState: JSON.stringify({ channel, type, patientId }),
    }).catch((auditError) => {
      logServerError("Failed to create audit log", auditError);
      // Silently fail - audit logging is best-effort
    });

    return NextResponse.json(finalCommunication, { status: 201 });
  } catch (error) {
    logServerError("POST /api/communications error", error);
    return NextResponse.json(
      { error: "Failed to create communication" },
      { status: 500 },
    );
  }
}
