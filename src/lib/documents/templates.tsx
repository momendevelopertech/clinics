import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

export interface TemplatePatient {
  firstName: string;
  lastName: string;
  mrn?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}

export interface TemplateOrg {
  name: string;
}

export interface TemplateEncounter {
  startTime: Date | string;
  diagnoses: Array<{ code: string; name: string }>;
  prescriptions: Array<{
    medicationName: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }>;
  notes: Array<{
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
  }>;
  vitals: Array<{
    bloodPressureSystolic?: number | null;
    bloodPressureDiastolic?: number | null;
    heartRate?: number | null;
    temperature?: number | null;
  }>;
}

export interface TemplateLabOrder {
  testName: string;
  orderType: string;
  priority: string;
  indication?: string | null;
  status: string;
  orderedAt: Date | string;
}

export interface TemplateData {
  org: TemplateOrg;
  patient: TemplatePatient;
  doctorName?: string | null;
  encounter?: TemplateEncounter | null;
  labOrder?: TemplateLabOrder | null;
  fields: Record<string, string>;
  issuedAt: Date;
}

export type TemplateId =
  | "referral"
  | "medical_report"
  | "lab_request"
  | "imaging_request"
  | "discharge_summary"
  | "sick_leave";

export interface TemplateDef {
  id: TemplateId;
  /** Persisted Document.type value. */
  docType: string;
  /** Extra request fields required beyond patientId. */
  requiredFields: string[];
  /** Needs a lab order (by id or by fields.testName). */
  needsLabOrder: boolean;
  fileName: (data: TemplateData) => string;
}

export const TEMPLATE_REGISTRY: TemplateDef[] = [
  {
    id: "referral",
    docType: "referral",
    requiredFields: ["referredTo", "specialty", "reason"],
    needsLabOrder: false,
    fileName: (d) => `referral-${d.patient.lastName}-${stamp(d.issuedAt)}.pdf`,
  },
  {
    id: "medical_report",
    docType: "medical_report",
    requiredFields: [],
    needsLabOrder: false,
    fileName: (d) => `medical-report-${d.patient.lastName}-${stamp(d.issuedAt)}.pdf`,
  },
  {
    id: "lab_request",
    docType: "lab_request",
    requiredFields: [],
    needsLabOrder: true,
    fileName: (d) => `lab-request-${d.patient.lastName}-${stamp(d.issuedAt)}.pdf`,
  },
  {
    id: "imaging_request",
    docType: "imaging_request",
    requiredFields: [],
    needsLabOrder: true,
    fileName: (d) => `imaging-request-${d.patient.lastName}-${stamp(d.issuedAt)}.pdf`,
  },
  {
    id: "discharge_summary",
    docType: "discharge_summary",
    requiredFields: [],
    needsLabOrder: false,
    fileName: (d) => `discharge-${d.patient.lastName}-${stamp(d.issuedAt)}.pdf`,
  },
  {
    id: "sick_leave",
    docType: "sick_leave",
    requiredFields: ["restDays", "startDate", "diagnosisText"],
    needsLabOrder: false,
    fileName: (d) => `sick-leave-${d.patient.lastName}-${stamp(d.issuedAt)}.pdf`,
  },
];

function stamp(d: Date) {
  return d.toISOString().split("T")[0];
}

export function getTemplateDef(id: string): TemplateDef | null {
  return TEMPLATE_REGISTRY.find((t) => t.id === id) ?? null;
}

/** Returns missing required inputs for a template (field names + lab order). */
export function missingTemplateInputs(
  def: TemplateDef,
  data: Pick<TemplateData, "fields" | "labOrder">,
): string[] {
  const missing = def.requiredFields.filter((f) => !data.fields[f]?.trim());
  if (def.needsLabOrder && !data.labOrder && !data.fields.testName?.trim()) {
    missing.push("labOrderId-or-testName");
  }
  return missing;
}

// ---------- PDF layout ----------

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { borderBottom: "2 solid #0e7490", paddingBottom: 10, marginBottom: 14 },
  org: { fontSize: 16, fontWeight: "bold", color: "#0e7490" },
  title: { fontSize: 14, fontWeight: "bold", marginTop: 4 },
  meta: { fontSize: 9, color: "#555", marginTop: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#0e7490", marginBottom: 4 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: "#555" },
  value: { flex: 1 },
  bullet: { marginLeft: 12, marginBottom: 3 },
  footer: { marginTop: 24, borderTop: "1 solid #ccc", paddingTop: 8, fontSize: 9, color: "#555" },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
});

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Shell({
  title,
  data,
  children,
}: {
  title: string;
  data: TemplateData;
  children: React.ReactNode;
}) {
  const p = data.patient;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.org}>{data.org.name}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>Issued: {data.issuedAt.toISOString().split("T")[0]}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <Field label="Name" value={`${p.firstName} ${p.lastName}`} />
          <Field label="MRN" value={p.mrn} />
          <Field label="Phone" value={p.phone} />
          <Field label="DOB" value={p.dateOfBirth} />
          <Field label="Gender" value={p.gender} />
        </View>
        {children}
        <View style={styles.signRow}>
          <Text>Doctor: {data.doctorName ?? "—"}</Text>
          <Text>Signature: __________</Text>
        </View>
        <View style={styles.footer}>
          <Text>Generated by {data.org.name} — {data.issuedAt.toISOString()}</Text>
        </View>
      </Page>
    </Document>
  );
}

function EncounterSections({ data }: { data: TemplateData }) {
  const e = data.encounter;
  if (!e) return null;
  return (
    <>
      {e.diagnoses.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnoses</Text>
          {e.diagnoses.map((d, i) => (
            <Text key={i} style={styles.bullet}>
              • {d.code} — {d.name}
            </Text>
          ))}
        </View>
      ) : null}
      {e.prescriptions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medications</Text>
          {e.prescriptions.map((m, i) => (
            <Text key={i} style={styles.bullet}>
              • {m.medicationName}
              {m.dosage ? ` — ${m.dosage}` : ""}
              {m.frequency ? `, ${m.frequency}` : ""}
              {m.duration ? ` × ${m.duration}` : ""}
              {m.instructions ? ` (${m.instructions})` : ""}
            </Text>
          ))}
        </View>
      ) : null}
      {e.notes.length > 0 && e.notes[0] ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical notes</Text>
          <Field label="Subjective" value={e.notes[0].subjective} />
          <Field label="Objective" value={e.notes[0].objective} />
          <Field label="Assessment" value={e.notes[0].assessment} />
          <Field label="Plan" value={e.notes[0].plan} />
        </View>
      ) : null}
    </>
  );
}

function TemplateDoc({ id, data }: { id: TemplateId; data: TemplateData }) {
  switch (id) {
    case "referral":
      return (
        <Shell title="Referral Letter" data={data}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Referral</Text>
            <Field label="Referred to" value={data.fields.referredTo} />
            <Field label="Specialty" value={data.fields.specialty} />
            <Field label="Reason" value={data.fields.reason} />
          </View>
          <EncounterSections data={data} />
        </Shell>
      );
    case "medical_report":
      return (
        <Shell title="Medical Report" data={data}>
          {data.fields.summary ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <Text>{data.fields.summary}</Text>
            </View>
          ) : null}
          <EncounterSections data={data} />
        </Shell>
      );
    case "lab_request":
    case "imaging_request": {
      const lo = data.labOrder;
      return (
        <Shell title={id === "lab_request" ? "Laboratory Request" : "Imaging Request"} data={data}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request</Text>
            <Field label="Test" value={lo?.testName ?? data.fields.testName} />
            <Field label="Priority" value={lo?.priority} />
            <Field label="Indication" value={lo?.indication ?? data.fields.indication} />
            <Field label="Status" value={lo?.status} />
          </View>
          <EncounterSections data={data} />
        </Shell>
      );
    }
    case "discharge_summary":
      return (
        <Shell title="Discharge Summary" data={data}>
          <EncounterSections data={data} />
          {data.fields.instructions ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Discharge instructions</Text>
              <Text>{data.fields.instructions}</Text>
            </View>
          ) : null}
        </Shell>
      );
    case "sick_leave":
      return (
        <Shell title="Sick Leave Certificate" data={data}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certification</Text>
            <Field label="Diagnosis" value={data.fields.diagnosisText} />
            <Field label="Rest from" value={data.fields.startDate} />
            <Field label="Rest days" value={data.fields.restDays} />
          </View>
        </Shell>
      );
  }
}

export async function renderTemplatePdf(id: TemplateId, data: TemplateData): Promise<Buffer> {
  const buf = await renderToBuffer(<TemplateDoc id={id} data={data} />);
  return Buffer.from(buf);
}
