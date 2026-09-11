/** Lab e-order exchange artifacts (pure). The transmit payload is a
 * FHIR-R4-shaped DiagnosticRequest the clinic hands to its lab (portal
 * upload / email); the lab quotes externalRef back with results. */

export interface ExchangeOrder {
  id: string;
  externalRef: string;
  orderType: string;
  testName: string;
  priority: string;
  indication?: string | null;
  orderedAt: Date | string;
}

export interface ExchangePatient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
}

export function buildDiagnosticRequest(
  order: ExchangeOrder,
  patient: ExchangePatient,
  organizationId: string,
) {
  return {
    resourceType: "DiagnosticRequest",
    identifier: [{ system: "urn:openhealthcrm:lab-external-ref", value: order.externalRef }],
    status: "active",
    intent: "order",
    priority: order.priority === "stat" ? "stat" : order.priority === "urgent" ? "urgent" : "routine",
    code: { text: order.testName },
    subject: {
      reference: `Patient/${patient.id}`,
      display: `${patient.firstName} ${patient.lastName}`,
      mrn: patient.mrn ?? undefined,
    },
    requester: { organizationId },
    authoredOn: new Date(order.orderedAt).toISOString(),
    reasonCode: order.indication ? [{ text: order.indication }] : undefined,
    category: order.orderType === "imaging" ? "imaging" : "laboratory",
  };
}

export function mintExternalRef(now: Date = new Date()): string {
  return `EXT-${now.getTime().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}
