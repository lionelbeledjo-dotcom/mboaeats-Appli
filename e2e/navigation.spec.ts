import { test, expect } from "@playwright/test";

test.describe("Navigation & layout", () => {
  test("connexion page loads without fatal JS errors", async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on("pageerror", (err) => {
      // Ignore known non-fatal errors
      if (err.message.includes("ResizeObserver")) return;
      if (err.message.includes("Script error")) return;
      if (err.message.includes("hydration")) return;
      fatalErrors.push(err.message);
    });
    await page.goto("/connexion", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    expect(fatalErrors).toHaveLength(0);
  });

  test("health endpoint is accessible", async ({ request }) => {
    const res = await request.get("/api/public/health");
    expect(res.status()).toBeLessThan(504);
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks");
  });
});
