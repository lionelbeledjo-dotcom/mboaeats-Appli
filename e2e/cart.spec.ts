import { test, expect } from "@playwright/test";

test.describe("Cart functionality", () => {
  test("empty cart page shows empty state", async ({ page }) => {
    await page.goto("/panier");
    await expect(page.locator("text=/vide|empty/i")).toBeVisible({ timeout: 15_000 });
  });

  test("dish detail page has add-to-cart button", async ({ page }) => {
    await page.goto("/restaurants/le-penja/plats/ndole-royal");
    await expect(page.getByRole("button", { name: /ajouter|panier|add/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
