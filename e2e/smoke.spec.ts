import { test, expect } from "./fixtures";

test.describe("Smoke: Owner can access dashboard", () => {
  test("owner lands on dashboard after login", async ({ rolePage: page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    const sidebar = page.locator("nav").first();
    await expect(sidebar).toBeVisible();
  });
});
