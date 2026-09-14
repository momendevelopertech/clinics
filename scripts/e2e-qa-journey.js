/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * QA E2E — Full Patient Journey across all 8 roles (live HTTP vs dev server).
 * Scratch data prefixed E2EQATEST; cleaned up at the end (report keeps ids).
 * Usage: node scripts/e2e-qa-journey.js [baseUrl]
 */
require("dotenv").config();
const { Pool } = require("pg");
const { randomBytes, scryptSync } = require("crypto");

const BASE = process.argv[2] || "http://localhost:3000";
const TAG = `E2EQATEST-${Date.now().toString(36)}`;
const results = [];
const ctx = {};

function step(role, name, ok, detail) {
  results.push({ role, name, ok, detail });
  console.log(`${ok === true ? "PASS" : ok === false ? "FAIL" : "WARN"} [${role}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(role, name, detail) { step(role, name, false, detail); throw new Error(`E2E abort at [${role}] ${name}: ${detail}`); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function q(text, params) { const r = await pool.query(text, params); return r.rows; }
function hashPw(pw) { const s = randomBytes(16).toString("hex"); return `scrypt$${s}$${scryptSync(pw, s, 64).toString("hex")}`; }

// --- cookie-jar fetch ---
function jar() { return { cookies: [] }; }
async function jfetch(j, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (j.cookies.length) headers.cookie = j.cookies.join("; ");
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, redirect: "manual" });
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const pair = sc.split(";")[0];
    const name = pair.split("=")[0];
    j.cookies = j.cookies.filter((c) => !c.startsWith(`${name}=`));
    j.cookies.push(pair);
  }
  return res;
}
async function staffLogin(email, password) {
  const j = jar();
  const csrfRes = await jfetch(j, "/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const body = new URLSearchParams({ csrfToken, email, password, json: "true" });
  const res = await jfetch(j, "/api/auth/callback/credentials", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  if (res.status !== 200) throw new Error(`staff login ${email} -> HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(`staff login ${email}: ${data.error}`);
  return j;
}
async function api(j, method, path, body) {
  const res = await jfetch(j, path, {
    method, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  // 0. bootstrap ids from DB
  const orgs = await q("SELECT id, slug FROM \"Organization\" WHERE slug IN ('alexandria-medical-center','demo-alexandria-family-clinic')");
  const org = orgs.find((o) => o.slug === "alexandria-medical-center");
  const demoOrg = orgs.find((o) => o.slug === "demo-alexandria-family-clinic");
  const docs = await q("SELECT id, email, name FROM \"User\" WHERE \"organizationId\"=$1 AND role='doctor' AND active ORDER BY email", [org.id]);
  const doctor = docs[0];
  const stock = await q("SELECT id, name, quantity FROM \"InventoryItem\" WHERE \"organizationId\"=$1 AND category='medication' AND quantity > 50 ORDER BY quantity DESC LIMIT 1", [org.id]);
  const med = stock[0];
  ctx.beforeQty = med.quantity;
  ctx.medId = med.id;
  step("Seed", "bootstrap", true, `org=${org.slug} doctor=${doctor.email} med=${med.name} qty=${med.quantity}`);

  // 1. Reception: register patient + book
  const recep = await staffLogin("receptionist@acmeclinic.com", "admin123");
  step("Reception", "login", true);
  const email = `${TAG}@example.test`.toLowerCase();
  let r = await api(recep, "POST", "/api/patients", { firstName: `${TAG}-Karim`, lastName: " journey", email, phone: `0100${String(Date.now()).slice(-7)}` });
  if (r.status !== 200 && r.status !== 201) fail("Reception", "register patient", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  const patient = r.data.patient ?? r.data;
  ctx.patientId = patient.id;
  step("Reception", "register patient", true, patient.id);
  const start = new Date(Date.now() + 30 * 60000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 20 * 60000);
  r = await api(recep, "POST", "/api/appointments", {
    patientId: patient.id, providerId: doctor.id,
    startTime: start.toISOString(), endTime: end.toISOString(),
    appointmentType: "consultation", idempotencyKey: `${TAG}-appt`,
  });
  if (r.status !== 200 && r.status !== 201) fail("Reception", "book appointment", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  const appt = r.data.appointment ?? r.data;
  ctx.appointmentId = appt.id;
  step("Reception", "book appointment", true, `${appt.id} ${start.toISOString()}`);

  // 2. Reception: check-in -> queue
  r = await api(recep, "POST", `/api/appointments/${appt.id}/check-in`, {});
  if (r.status !== 200) fail("Reception", "check-in", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  step("Reception", "check-in", true);
  r = await api(recep, "GET", "/api/queue");
  const inQueue = Array.isArray(r.data) && r.data.some((x) => x.id === appt.id);
  if (!inQueue) fail("Reception", "queue shows patient", JSON.stringify(r.data).slice(0, 200));
  step("Reception", "queue shows patient (H1)", true);

  // 3. Nurse: vitals
  const nurse = await staffLogin("nurse@acmeclinic.com", "admin123");
  step("Nurse", "login", true);
  r = await api(nurse, "POST", "/api/vitals", { patientId: patient.id, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, heartRate: 72, temperature: 37, weightKg: 70, heightCm: 170 });
  if (r.status !== 200 && r.status !== 201) fail("Nurse", "record vitals", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  if (r.data.bmi == null) fail("Nurse", "BMI auto-calc", JSON.stringify(r.data).slice(0, 200));
  step("Nurse", "record vitals + auto-BMI", true, `bmi=${r.data.bmi}`);

  // 4. Doctor: sees vitals, starts encounter linked to appointment
  const doc = await staffLogin(doctor.email, "admin123");
  step("Doctor", "login", true);
  r = await api(doc, "GET", `/api/vitals?patientId=${patient.id}`);
  if (!Array.isArray(r.data) || r.data.length === 0) fail("Doctor", "sees nurse vitals (H2/G4)", `HTTP ${r.status}`);
  step("Doctor", "sees nurse vitals in workspace API (H2/G4)", true, `${r.data.length} reading(s)`);
  r = await api(doc, "POST", "/api/encounters", { patientId: patient.id, appointmentId: appt.id, encounterType: "office_visit" });
  if (r.status !== 200 && r.status !== 201) fail("Doctor", "start encounter linked (G3)", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  const enc = r.data.encounter ?? r.data;
  ctx.encounterId = enc.id;
  step("Doctor", "start encounter linked to appointment (G3)", true, enc.id);

  // 5. Doctor: queue call-next auto-encounter (idempotent — returns same encounter)
  r = await api(recep, "POST", "/api/queue/actions", { action: "call-next", appointmentId: appt.id });
  if (r.status !== 200) fail("Reception", "call-next auto-encounter", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  if (r.data.encounterId !== enc.id) fail("Reception", "call-next idempotent encounter", `got ${r.data.encounterId} want ${enc.id}`);
  step("Reception", "call-next returns same encounter (G3 idempotent)", true);

  // 6. Doctor: prescription from DB med + template use
  r = await api(doc, "GET", `/api/medications/search?q=${encodeURIComponent(med.name.split(" ")[0])}&limit=5`);
  if (!Array.isArray(r.data) || r.data.length === 0) fail("Doctor", "medication DB search (G1)", `HTTP ${r.status}`);
  step("Doctor", "medication DB search (G1)", true, `${r.data.length} hit(s)`);
  r = await api(doc, "GET", "/api/prescription-templates");
  const tpls = r.data.templates ?? r.data;
  if (!Array.isArray(tpls) || tpls.length === 0) fail("Doctor", "templates seeded (G2)", `HTTP ${r.status}`);
  step("Doctor", "prescription templates present (G2)", true, `${tpls.length} template(s)`);
  r = await api(doc, "POST", "/api/prescriptions", {
    patientId: patient.id, encounterId: enc.id,
    medicationName: med.name, dosage: "قرص واحد", frequency: "مرة يوميًا", duration: "7 أيام",
    items: [],
  });
  if (r.status !== 200 && r.status !== 201) fail("Doctor", "write prescription", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  ctx.prescriptionId = r.data.id;
  step("Doctor", "write prescription linked to visit", true, r.data.id);

  // 7. Doctor closes visit -> auto-invoice (G7); doctor must NOT read billing
  r = await api(doc, "PATCH", `/api/encounters/${enc.id}`, { status: "completed" });
  if (r.status !== 200) fail("Doctor", "close visit", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  const autoInv = r.data.autoInvoice;
  if (!autoInv?.id) fail("Doctor", "auto-invoice on close (G7)", JSON.stringify(r.data).slice(0, 300));
  ctx.invoiceId = autoInv.id;
  step("Doctor", "auto-invoice on close (G7)", true, `${autoInv.invoiceNumber} total=${autoInv.totalAmount}`);
  r = await api(doc, "GET", "/api/billing/invoices?patientId=" + patient.id);
  if (r.status !== 403) fail("Doctor", "billing forbidden for doctor", `HTTP ${r.status} (expected 403)`);
  step("Doctor", "billing forbidden for doctor (RBAC)", true, "403 as expected");

  // 8. Pharmacist: dispense -> stock deduction + status
  const pharm = await staffLogin("pharmacist@acmeclinic.com", "admin123");
  step("Pharmacist", "login", true);
  r = await api(pharm, "POST", `/api/prescriptions/${ctx.prescriptionId}/dispense`, {
    lines: [{ medicationName: med.name, inventoryItemId: med.id, quantity: 2 }],
  });
  if (r.status !== 200) fail("Pharmacist", "dispense (G5/G8)", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  if (r.data.updated?.status !== "completed" || r.data.updated?.sentToPharmacy !== true)
    fail("Pharmacist", "rx completed+sentToPharmacy", JSON.stringify(r.data).slice(0, 200));
  const after = await q("SELECT quantity FROM \"InventoryItem\" WHERE id=$1", [med.id]);
  if (after[0].quantity !== ctx.beforeQty - 2) fail("Pharmacist", "stock deducted", `before=${ctx.beforeQty} after=${after[0].quantity}`);
  step("Pharmacist", "dispense deducts stock + completes Rx (G5/G8)", true, `qty ${ctx.beforeQty}->${after[0].quantity}`);

  // 9. Biller: collect payment -> receipt data
  const biller = await staffLogin("billing@acmeclinic.com", "admin123");
  step("Biller", "login", true);
  r = await api(biller, "GET", `/api/billing/invoices?patientId=${patient.id}`);
  const inv = Array.isArray(r.data) ? r.data.find((x) => x.id === ctx.invoiceId) : null;
  if (!inv) fail("Biller", "sees auto-invoice", `HTTP ${r.status}`);
  step("Biller", "sees auto-invoice", true, `${inv.invoiceNumber} status=${inv.status}`);
  const total = Number(inv.totalAmount);
  r = await api(biller, "POST", "/api/payments", { invoiceId: ctx.invoiceId, amount: total > 0 ? total : 50, currency: "EGP", method: "cash" });
  if (r.status !== 200 && r.status !== 201) fail("Biller", "record cash payment", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  step("Biller", "record payment", true);
  r = await api(biller, "GET", `/api/billing/invoices?patientId=${patient.id}`);
  const paid = Array.isArray(r.data) ? r.data.find((x) => x.id === ctx.invoiceId) : null;
  step("Biller", "invoice status after pay", paid && paid.status === "paid", `status=${paid?.status} paid=${paid?.amountPaid}/${paid?.totalAmount}`);

  // 10. Portal: login as patient, sees rx + invoice + visits
  await q("UPDATE \"Patient\" SET \"passwordHash\"=$1, mrn=$2 WHERE id=$3", [hashPw("patient123"), `QA-${TAG}`.slice(0, 20), patient.id]);
  const pj = jar();
  {
    const res = await jfetch(pj, "/api/patient-auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "patient123", mrn: `QA-${TAG}`.slice(0, 20) }),
    });
    if (res.status !== 200) fail("Patient Portal", "login", `HTTP ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  }
  step("Patient Portal", "login", true);
  r = await api(pj, "GET", "/api/patient-portal/prescriptions");
  const seesRx = r.status === 200 && Array.isArray(r.data.prescriptions) && r.data.prescriptions.some((x) => x.id === ctx.prescriptionId);
  if (!seesRx) fail("Patient Portal", "sees prescription (G10)", `HTTP ${r.status}`);
  step("Patient Portal", "sees prescription (G10)", true);
  r = await api(pj, "GET", "/api/patient-portal/visits");
  const seesVisit = r.status === 200 && Array.isArray(r.data.visits) && r.data.visits.some((x) => x.id === ctx.encounterId);
  if (!seesVisit) fail("Patient Portal", "sees visit history (G10)", `HTTP ${r.status}`);
  step("Patient Portal", "sees visit history (G10)", true);
  r = await api(pj, "GET", "/api/patient-portal/invoices");
  const seesInv = r.status === 200 && JSON.stringify(r.data).includes(ctx.invoiceId);
  if (!seesInv) fail("Patient Portal", "sees invoice", `HTTP ${r.status}`);
  step("Patient Portal", "sees invoice", true);

  // 11. Owner: reports
  const owner = await staffLogin("owner@acmeclinic.com", "admin123");
  step("Owner", "login", true);
  const month = new Date().toISOString().slice(0, 7);
  r = await api(owner, "GET", `/api/reports/monthly?month=${month}`);
  if (r.status !== 200) fail("Owner", "monthly report", `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  step("Owner", "monthly report (H6)", true);

  // 12. Super admin + isolation
  const super_ = await staffLogin("superadmin@acmeclinic.com", "admin123");
  step("Super Admin", "login", true);
  r = await api(super_, "GET", "/api/super/orgs");
  if (r.status !== 200) fail("Super Admin", "list orgs", `HTTP ${r.status}`);
  step("Super Admin", "platform orgs (no clinic data)", true, `${Array.isArray(r.data) ? r.data.length : "?"} org(s)`);
  if (demoOrg) {
    const demoDocs = await q("SELECT email FROM \"User\" WHERE \"organizationId\"=$1 AND role='doctor' AND active LIMIT 1", [demoOrg.id]);
    if (demoDocs.length) {
      const demoDoc = await staffLogin(demoDocs[0].email, "DemoClinic!2026");
      r = await api(demoDoc, "GET", `/api/patients/${patient.id}`);
      if (r.status !== 404) fail("Super Admin", "tenant isolation (cross-org 404)", `HTTP ${r.status} (expected 404)`);
      step("Super Admin", "tenant isolation: org B cannot see org A patient", true, "404 as expected");
    } else step("Super Admin", "tenant isolation", null, "no demo doctor found — manual");
  } else step("Super Admin", "tenant isolation", null, "no second org — manual");
}

async function cleanup() {
  const ids = ctx;
  // NOTE: AuditLog is append-only (DB trigger blocks deletes) — audit rows
  // for scratch ids intentionally remain; everything else is removed.
  const safe = async (label, fn) => {
    try { await fn(); } catch (e) { console.log(`cleanup skip ${label}: ${e.message}`); }
  };
  if (ids.medId && ids.beforeQty != null) {
    await safe("restore-stock", async () => {
      await q("DELETE FROM \"InventoryTransaction\" WHERE reason LIKE $1", [`%${ids.prescriptionId}%`]);
      await q("UPDATE \"InventoryItem\" SET quantity=$1 WHERE id=$2", [ids.beforeQty, ids.medId]);
    });
  }
    if (ids.invoiceId) {
      await safe("payments", async () => {
        const pays = await q("SELECT id FROM \"Payment\" WHERE \"invoiceId\"=$1", [ids.invoiceId]);
        for (const p of pays) await q("DELETE FROM \"Payment\" WHERE id=$1", [p.id]);
      });
      await safe("invoice-lines", async () => {
        await q("DELETE FROM \"InvoiceLineItem\" WHERE \"invoiceId\"=$1", [ids.invoiceId]);
      });
      await safe("invoice", async () => {
        await q("DELETE FROM \"Invoice\" WHERE id=$1", [ids.invoiceId]);
      });
    }
    if (ids.prescriptionId) {
      await safe("rx-items", async () => {
        await q("DELETE FROM \"PrescriptionItem\" WHERE \"prescriptionId\"=$1", [ids.prescriptionId]);
      });
      await safe("rx", async () => {
        await q("DELETE FROM \"Prescription\" WHERE id=$1", [ids.prescriptionId]);
      });
    }
    if (ids.encounterId) {
      await safe("notes+vitals", async () => {
        await q("DELETE FROM \"EncounterNote\" WHERE \"encounterId\"=$1", [ids.encounterId]);
        await q("DELETE FROM \"Vital\" WHERE \"encounterId\"=$1", [ids.encounterId]);
      });
      await safe("encounter", async () => {
        await q("DELETE FROM \"Encounter\" WHERE id=$1", [ids.encounterId]);
      });
    }
    if (ids.appointmentId) {
      await safe("appointment", async () => {
        await q("DELETE FROM \"Appointment\" WHERE id=$1", [ids.appointmentId]);
      });
    }
    if (ids.patientId) {
      await safe("patient-children", async () => {
        await q("DELETE FROM \"PatientSession\" WHERE \"patientId\"=$1", [ids.patientId]);
        await q("DELETE FROM \"Vital\" WHERE \"patientId\"=$1", [ids.patientId]);
        await q("DELETE FROM \"EmergencyContact\" WHERE \"patientId\"=$1", [ids.patientId]);
      });
      await safe("patient", async () => {
        await q("DELETE FROM \"Patient\" WHERE id=$1", [ids.patientId]);
      });
    }
    console.log("cleanup done");
}

(async () => {
  try { await main(); }
  catch (e) { console.log(`ABORT: ${e.message}`); process.exitCode = 1; }
  finally { await cleanup(); await pool.end(); }
  const failed = results.filter((x) => x.ok === false).length;
  console.log(`\nE2E summary: ${results.length - failed}/${results.length} passed`);
})();
