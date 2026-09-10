import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { chromium, type Browser, type FullConfig } from "@playwright/test";

const AUTH_DIR = join(import.meta.dirname, ".auth");

type RoleAccount = {
  role: string;
  email: string;
  password: string;
};

const ROLE_ACCOUNTS: RoleAccount[] = [
  { role: "owner", email: "owner@acmeclinic.com", password: "admin123" },
  { role: "doctor", email: "admin@acmeclinic.com", password: "admin123" },
  { role: "receptionist", email: "receptionist@acmeclinic.com", password: "admin123" },
  { role: "care-coordinator", email: "ops@acmeclinic.com", password: "admin123" },
  { role: "accountant", email: "billing@acmeclinic.com", password: "admin123" },
  { role: "nurse", email: "nurse@acmeclinic.com", password: "admin123" },
  { role: "pharmacist", email: "pharmacist@acmeclinic.com", password: "admin123" },
];

async function loginAndSave(browser: Browser, account: RoleAccount) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/login");
  await page.waitForSelector('input[name="email"]', { timeout: 10_000 });

  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const storageState = await context.storageState();
  writeFileSync(join(AUTH_DIR, `${account.role}.json`), JSON.stringify(storageState, null, 2));

  await context.close();
}

export default async function globalSetup(_config: FullConfig) {
  mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const account of ROLE_ACCOUNTS) {
      console.log(`  Saving auth state for: ${account.role} (${account.email})`);
      await loginAndSave(browser, account);
    }
    console.log(`  Global setup complete: ${ROLE_ACCOUNTS.length} role storageStates saved.`);
  } finally {
    await browser.close();
  }
}
