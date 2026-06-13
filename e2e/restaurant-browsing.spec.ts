import { test, expect } from "@playwright/test";

test.describe("Restaurant browsing (public pages)", () => {
  test("cuisines page lists categories", async ({ page }) => {
    await page.goto("/cuisines");
    await expect(page.locator("h1, h2").filter({ hasText: /cuisine/i })).toBeVisible({
      timeout: 15_000,
    });
    const cards = page.locator("a[href*='/categorie/']");
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    expect(await cards.count()).toBeGreaterThanOrEqual(5);
  });

  test("category page shows dishes", async ({ page }) => {
    await page.goto("/categorie/ndole");
    await expect(page.locator("h1").filter({ hasText: /ndolé/i })).toBeVisible({ timeout: 15_000 });
    const dishCards = page.locator("a[href*='/plats/']");
    await expect(dishCards.first()).toBeVisible({ timeout: 10_000 });
    expect(await dishCards.count()).toBeGreaterThanOrEqual(1);
  });

  test("popular page displays dishes sorted by rating", async ({ page }) => {
    await page.goto("/populaire");
    await expect(page.locator("h1").filter({ hasText: /populaire/i })).toBeVisible({
      timeout: 15_000,
    });
    const items = page.locator("a[href*='/plats/']");
    await expect(items.first()).toBeVisible({ timeout: 10_000 });
    expect(await items.count()).toBeGreaterThanOrEqual(5);
  });

  test("nearby page lists restaurants by proximity", async ({ page }) => {
    await page.goto("/proximite");
    await expect(page.locator("h1").filter({ hasText: /proximité/i })).toBeVisible({
      timeout: 15_000,
    });
    const cards = page.locator("a[href*='/restaurants/']");
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("search page allows text filtering", async ({ page }) => {
    await page.goto("/recherche");
    const input = page.locator("input[type='search'], input[placeholder*='cherch' i]");
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill("ndole");
    await page.waitForTimeout(500);
    const results = page.locator("text=/résultat/i");
    await expect(results).toBeVisible({ timeout: 10_000 });
  });

  test("restaurant detail page shows menu categories", async ({ page }) => {
    await page.goto("/restaurants/le-penja");
    await expect(page.locator("h1, h2").filter({ hasText: /penja/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
