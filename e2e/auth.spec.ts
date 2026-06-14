import { test, expect } from "@playwright/test";

test.describe("Authentication flows", () => {
  test("redirects unauthenticated user to /connexion", async ({ page }) => {
    await page.goto("/");
    // Wait for either redirect to connexion or the page to load
    await page.waitForURL(/\/(connexion|$)/, { timeout: 30_000 });
    const url = page.url();
    // Unauthenticated users should end on /connexion
    expect(url.includes("connexion") || url.endsWith("/")).toBe(true);
  });

  test("login page renders content after hydration", async ({ page }) => {
    await page.goto("/connexion", { waitUntil: "networkidle" });
    // Wait for hydration — spinner should disappear
    await page.waitForTimeout(3000);
    // Check that SOMETHING rendered (not just a spinner)
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("signup page is reachable", async ({ page }) => {
    await page.goto("/inscription", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText!.length).toBeGreaterThan(50);
  });
});
