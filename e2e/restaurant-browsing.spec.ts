import { test, expect } from "@playwright/test";

test.describe("Restaurant browsing", () => {
  test("cuisines page responds without 500", async ({ page }) => {
    const response = await page.goto("/cuisines", { waitUntil: "networkidle" });
    expect(response!.status()).not.toBe(500);
  });

  test("search page responds without 500", async ({ page }) => {
    const response = await page.goto("/recherche", { waitUntil: "networkidle" });
    expect(response!.status()).not.toBe(500);
  });

  test("restaurant detail responds without 500", async ({ page }) => {
    const response = await page.goto("/restaurants/le-penja", {
      waitUntil: "networkidle",
    });
    expect(response!.status()).not.toBe(500);
  });

  test("category page responds without 500", async ({ page }) => {
    const response = await page.goto("/categorie/ndole", {
      waitUntil: "networkidle",
    });
    expect(response!.status()).not.toBe(500);
  });
});
