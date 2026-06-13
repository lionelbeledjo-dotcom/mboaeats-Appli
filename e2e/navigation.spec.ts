import { test, expect } from "@playwright/test";

test.describe("Navigation & layout", () => {
  test("connexion page loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/connexion");
    await page.waitForLoadState("networkidle");
    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("bottom dock is visible on mobile for authenticated pages", async ({ page }) => {
    await page.goto("/cuisines");
    const dock = page.locator("[data-testid='bottom-dock'], nav[role='navigation']").last();
    await expect(dock).toBeVisible({ timeout: 15_000 });
  });

  test("aide page loads", async ({ page }) => {
    await page.goto("/aide");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 15_000 });
  });
});
