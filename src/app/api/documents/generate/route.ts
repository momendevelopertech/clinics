import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { documentGenerateSchema } from "@/lib/validations/uploads";
import {
  getTemplateDef,
  missingTemplateInputs,
  renderTemplatePdf,
  type TemplateData,
  type TemplateId,
} from "@/lib/documents/templates";
import {
  getCloudinaryConfigStatus,
  uploadBufferToCloudinary,
} from "@/lib/cloudinary";

/**
 * POST /api/documents/generate { template, patientId, encounterId?,
 *   labOrderId?, fields? } — renders a server-side PDF from live clinical
 * data, uploads it to Cloudinary, and registers it as a Document (audited).
 * When Cloud storage is unconfigured, the PDF is returned directly as a
 * download instead (nothing persisted).
 */
export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "documents");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = documentGenerateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { template, patientId, encounterId, labOrderId, fields } = parsed.data;
    const def = getTemplateDef(template);
    if (!def) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

    const [patient, org, doctor] = await Promise.all([
      prisma.patient.findFirst({ where: { id: patientId, organizationId: orgId } }),
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
      prisma.user.findFirst({ where: { id: userId }, select: { name: true } }),
    ]);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const encounter = encounterId
      ? await prisma.encounter.findFirst({
          where: { id: encounterId, organizationId: orgId, patientId },
          include: {
            diagnoses: { select: { code: true, name: true } },
            prescriptions: {
              select: { medicationName: true, dosage: true, frequency: true, duration: true, instructions: true },
            },
            notes: {
              select: { subjective: true, objective: true, assessment: true, plan: true },
              take: 1,
            },
            vitals: {
              select: {
                bloodPressureSystolic: true,
                bloodPressureDiastolic: true,
                heartRate: true,
                temperature: true,
              },
              take: 1,
            },
          },
        })
      : null;
    if (encounterId && !encounter) {
      return NextResponse.json({ error: "Encounter not found for patient" }, { status: 404 });
    }

    const labOrder = labOrderId
      ? await prisma.labOrder.findFirst({
          where: { id: labOrderId, organizationId: orgId, patientId },
        })
      : null;
    if (labOrderId && !labOrder) {
      return NextResponse.json({ error: "Lab order not found for patient" }, { status: 404 });
    }

    const data: TemplateData = {
      org: { name: org?.name ?? "Clinic" },
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        mrn: patient.mrn,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth?.toISOString().split("T")[0] ?? null,
        gender: patient.gender,
      },
      doctorName: doctor?.name ?? null,
      encounter,
      labOrder,
      fields: fields ?? {},
      issuedAt: new Date(),
    };
    const missing = missingTemplateInputs(def, data);
    if (missing.length > 0) {
      return NextResponse.json({ error: "Missing template inputs", missing }, { status: 400 });
    }

    const pdf = await renderTemplatePdf(template as TemplateId, data);
    const fileName = def.fileName(data);

    if (!getCloudinaryConfigStatus().configured) {
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "X-Document-Persisted": "0",
        },
      });
    }

    const upload = await uploadBufferToCloudinary({
      buffer: pdf,
      mimeType: "application/pdf",
      organizationId: orgId,
      purpose: "document",
      fileName,
    });
    const document = await prisma.document.create({
      data: {
        organizationId: orgId,
        patientId,
        name: fileName,
        type: def.docType,
        storageKey: upload.secureUrl,
        publicId: upload.publicId,
        mimeType: "application/pdf",
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Document",
      entityId: document.id,
      afterState: JSON.stringify({ template, type: def.docType, name: fileName }),
    });
    return NextResponse.json(
      { documentId: document.id, url: upload.secureUrl, name: fileName, persisted: true },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error generating document", error);
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}
