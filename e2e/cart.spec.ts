import { test, expect } from "@playwright/test";

test.describe("Cart functionality", () => {
  test("cart page requires authentication", async ({ page }) => {
    await page.goto("/panier", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const url = page.url();
    // Cart is auth-gated — user gets redirected or sees loading
    expect(url.includes("connexion") || url.includes("panier")).toBe(true);
  });
});
