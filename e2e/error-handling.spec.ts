import { test, expect } from "@playwright/test";

test.describe("Error handling", () => {
  test("unknown route does not crash the app", async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on("pageerror", (err) => {
      if (err.message.includes("ResizeObserver")) return;
      fatalErrors.push(err.message);
    });
    const response = await page.goto("/cette-page-nexiste-pas-12345", {
      waitUntil: "networkidle",
    });
    // Should not be a server 500
    expect(response!.status()).not.toBe(500);
    expect(fatalErrors).toHaveLength(0);
  });

  test("unknown restaurant does not crash", async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on("pageerror", (err) => {
      if (err.message.includes("ResizeObserver")) return;
      fatalErrors.push(err.message);
    });
    const response = await page.goto("/restaurants/restaurant-inexistant-xyz", {
      waitUntil: "networkidle",
    });
    expect(response!.status()).not.toBe(500);
    expect(fatalErrors).toHaveLength(0);
  });
});
