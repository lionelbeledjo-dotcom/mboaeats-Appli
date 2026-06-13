import { test, expect } from "@playwright/test";

test.describe("Error handling", () => {
  test("404 page renders for unknown route", async ({ page }) => {
    await page.goto("/cette-page-nexiste-pas-12345");
    await expect(page.locator("text=/introuvable|not found|404/i")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("unknown restaurant shows not found", async ({ page }) => {
    await page.goto("/restaurants/restaurant-qui-nexiste-pas");
    await expect(page.locator("text=/introuvable|not found/i")).toBeVisible({ timeout: 15_000 });
  });

  test("unknown dish shows not found", async ({ page }) => {
    await page.goto("/restaurants/le-penja/plats/plat-inexistant");
    await expect(page.locator("text=/introuvable|not found/i")).toBeVisible({ timeout: 15_000 });
  });
});
