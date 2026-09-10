import { test as base, type Page } from "@playwright/test";
import { join } from "path";
import { readFileSync } from "fs";

export const ROLE_ROUTES: Record<string, string[]> = {
  owner: [
    "/dashboard", "/patients", "/appointments", "/billing", "/staff",
    "/settings", "/plan", "/locations", "/inventory", "/analytics",
    "/reports", "/audit", "/communications", "/documents", "/consents",
    "/waitlist", "/tasks", "/queue", "/catalogs", "/help",
  ],
  doctor: [
    "/dashboard", "/patients", "/appointments", "/encounters", "/labs",
    "/inventory", "/queue", "/help",
  ],
  receptionist: [
    "/dashboard", "/patients", "/appointments", "/billing", "/documents",
    "/consents", "/waitlist", "/queue", "/help",
  ],
  "care-coordinator": [
    "/dashboard", "/patients", "/appointments", "/communications",
    "/documents", "/consents", "/waitlist", "/tasks", "/help",
  ],
  accountant: [
    "/dashboard", "/billing", "/payments", "/reports", "/help",
  ],
  nurse: [
    "/dashboard", "/patients", "/appointments", "/encounters", "/labs",
    "/vitals", "/queue", "/help",
  ],
  pharmacist: [
    "/dashboard", "/patients", "/inventory", "/help",
  ],
};

export const BLOCKED_ROUTES: Record<string, string[]> = {
  owner: ["/super"],
  doctor: ["/billing", "/staff", "/settings", "/plan", "/super", "/audit"],
  receptionist: ["/staff", "/settings", "/plan", "/super", "/audit", "/analytics"],
  "care-coordinator": ["/billing", "/staff", "/settings", "/plan", "/super", "/audit"],
  accountant: ["/patients", "/appointments", "/staff", "/settings", "/plan", "/super"],
  nurse: ["/billing", "/staff", "/settings", "/plan", "/super", "/audit"],
  pharmacist: ["/appointments", "/billing", "/staff", "/settings", "/plan", "/super"],
};

const authDir = join(import.meta.dirname, ".auth");

function readAuthState(role: string) {
  const path = join(authDir, `${role}.json`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

type TestFixtures = {
  rolePage: Page;
  role: string;
};

export const test = base.extend<TestFixtures>({
  role: ["owner", { option: true }],

  rolePage: async ({ browser, role }, use) => {
    const context = await browser.newContext({
      storageState: readAuthState(role),
    });
    const page = await context.newPage();
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture callback, not a React hook
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
