import { test, expect } from "@playwright/test";

test.describe("Authentication flows", () => {
  test("redirects unauthenticated user to /connexion", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/connexion/);
    expect(page.url()).toContain("/connexion");
  });

  test("login page renders with phone input", async ({ page }) => {
    await page.goto("/connexion");
    await expect(
      page.locator(
        'input[type="tel"], input[placeholder*="phone" i], input[placeholder*="téléphone" i]',
      ),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("login page has signup link", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page.getByRole("link", { name: /inscription|créer|sign up/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("signup page is reachable", async ({ page }) => {
    await page.goto("/inscription");
    await expect(page.locator("h1, h2, [role='heading']")).toBeVisible({ timeout: 15_000 });
  });
});
