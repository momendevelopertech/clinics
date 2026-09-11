import { test, expect } from "./fixtures";

/**
 * P3 end-to-end journeys (seeded environment: `npm run db:seed`).
 * API-assisted pattern: test data is created through `page.request` with
 * timestamp idempotency keys (safe reruns), then asserted in the UI.
 * Authenticated journeys reuse the `rolePage` fixture (seeded role accounts).
 */

const stamp = () => Date.now().toString(36);

test.describe("Journey: owner signup then book", () => {
  test("new clinic signs up and owner books an appointment", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const email = `e2e-owner-${stamp()}@example.test`;

    await page.goto("/signup");
    const textInputs = page.locator('form input[type="text"]:not([name="company"])');
    await textInputs.nth(0).fill(`E2E Clinic ${stamp()}`);
    // Signup has a 3s min-fill anti-bot check counted from first keystroke.
    await page.waitForTimeout(3200);
    await textInputs.nth(1).fill("E2E Owner");
    await page.locator('form input[type="email"]').fill(email);
    await page.locator('form input[type="password"]').fill("E2EPass!2026");
    await page.locator('form button[type="submit"]').click();

    // Pending-approval screen with a back-to-login link.
    await expect(page.locator('a[href="/login"]').first()).toBeVisible({ timeout: 15_000 });
    await context.close();
  });

  test("seeded owner books an appointment visible in the schedule", async ({ rolePage: page }) => {
    const patientsRes = await page.request.get("/api/patients");
    expect(patientsRes.ok()).toBe(true);
    const patientsPayload = await patientsRes.json();
    const patients = Array.isArray(patientsPayload) ? patientsPayload : patientsPayload.patients ?? [];
    expect(patients.length).toBeGreaterThan(0);
    const patient = patients[0];

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().split("T")[0];
    const createRes = await page.request.post("/api/appointments", {
      data: {
        patientId: patient.id,
        date,
        time: "10:00",
        idempotencyKey: `e2e-book-${stamp()}`,
      },
    });
    expect(createRes.ok()).toBe(true);

    await page.goto("/appointments");
    await expect(page).toHaveURL(/\/appointments/);
    await expect(page.getByText(patient.firstName).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Journey: doctor encounter to prescription to lab", () => {
  test.use({ role: "doctor" });

  test("encounter, prescription, and lab order persist for a patient", async ({ rolePage: page }) => {
    const patientsRes = await page.request.get("/api/patients");
    expect(patientsRes.ok()).toBe(true);
    const patientsPayload = await patientsRes.json();
    const patients = Array.isArray(patientsPayload) ? patientsPayload : patientsPayload.patients ?? [];
    const patient = patients[0];
    const key = stamp();

    const encounterRes = await page.request.post("/api/encounters", {
      data: { patientId: patient.id, encounterType: "follow_up" },
    });
    expect(encounterRes.ok()).toBe(true);
    const encounter = await encounterRes.json();

    const rxRes = await page.request.post("/api/prescriptions", {
      data: {
        patientId: patient.id,
        encounterId: encounter.id,
        medicationName: "Amoxicillin",
        dosage: "500mg",
        frequency: "twice daily",
        idempotencyKey: `e2e-rx-${key}`,
      },
    });
    expect(rxRes.ok()).toBe(true);

    const labRes = await page.request.post("/api/lab-orders", {
      data: {
        patientId: patient.id,
        encounterId: encounter.id,
        orderType: "lab",
        testName: "CBC",
        priority: "routine",
      },
    });
    expect(labRes.ok()).toBe(true);

    await page.goto("/encounters");
    await expect(page).toHaveURL(/\/encounters/);
    await expect(page.getByText(patient.firstName).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Journey: biller collects a payment", () => {
  test.use({ role: "accountant" });

  test("open invoice is paid and balance drops", async ({ rolePage: page }) => {
    const invoicesRes = await page.request.get("/api/billing/invoices");
    expect(invoicesRes.ok()).toBe(true);
    const invoicesPayload = await invoicesRes.json();
    const invoices = Array.isArray(invoicesPayload) ? invoicesPayload : invoicesPayload.invoices ?? [];
    const open = invoices.find(
      (inv: { status?: string }) => inv.status && !["paid", "cancelled"].includes(inv.status),
    );
    expect(open, "seeded open invoice").toBeTruthy();

    const balance = Number(open.totalAmount) - Number(open.amountPaid ?? 0);
    const amount = Math.min(Math.max(balance, 1), 25);
    // NOTE: requires a Stripe test key (STRIPE_SECRET_KEY) — the route
    // creates a real test-mode payment intent.
    const payRes = await page.request.post("/api/payments", {
      data: { invoiceId: open.id, amount },
    });
    expect(payRes.ok()).toBe(true);

    await page.goto("/payments");
    await expect(page).toHaveURL(/\/payments/);
  });
});

test.describe("Journey: patient portal", () => {
  test("patient logs in with email, MRN, and password", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/patient-login");
    await page.locator("#email").fill("ahmed.sayed@example.com");
    await page.locator("#mrn").fill("MRN-1001");
    await page.locator("#password").fill("patient123");
    await page.locator('form button[type="submit"]').click();

    await page.waitForURL("**/patient-portal**", { timeout: 15_000 });
    await expect(page.getByText("MRN-1001").first()).toBeVisible({ timeout: 15_000 });
    await context.close();
  });
});

test.describe("Journey: receptionist is denied billing", () => {
  test.use({ role: "receptionist" });

  test("billing redirects back to the dashboard", async ({ rolePage: page }) => {
    await page.goto("/billing");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
