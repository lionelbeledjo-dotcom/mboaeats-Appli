import { test, expect } from "@playwright/test";

test.describe("Admin sidebar — no visual bounce on click", () => {
  test("sidebar items have no scale transform and don't shift layout", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 15_000 });

    // Collect sidebar nav buttons/links
    const items = page.locator("aside a, aside button, nav a, nav button").filter({
      hasText: /Vue|Commissions|Zones|Restaurants|Menus|Livreurs|Litiges|Clients|Commandes|Paramètres|Logs/i,
    });
    const count = await items.count();
    expect(count, "no sidebar items found").toBeGreaterThan(0);

    // 1) Static audit: no scale-* in className anywhere in sidebar
    const offenders = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("aside *, nav *")
      );
      const bad: string[] = [];
      for (const el of nodes) {
        const cls = el.className && typeof el.className === "string" ? el.className : "";
        if (/\bscale-\[|\bscale-\d|\bhover:scale-|\bactive:scale-/.test(cls)) {
          bad.push(cls);
        }
      }
      return bad;
    });
    expect(offenders, `sidebar still uses scale-* classes: ${offenders.join(" | ")}`).toEqual([]);

    // 2) Dynamic: click each item, ensure bbox is stable and main doesn't shift X
    const mainBoxBefore = await page.locator("main").boundingBox();
    expect(mainBoxBefore).not.toBeNull();

    for (let i = 0; i < Math.min(count, 8); i++) {
      const item = items.nth(i);
      const boxBefore = await item.boundingBox();
      if (!boxBefore) continue;

      // Hover triggers any :hover transform — measure during hover
      await item.hover();
      await page.waitForTimeout(80);
      const boxHover = await item.boundingBox();

      await item.click();
      // Wait for navigation/render frame
      await page.waitForTimeout(120);
      const boxAfter = await item.boundingBox();
      const mainBoxAfter = await page.locator("main").boundingBox();

      // Size must not change (no scale transform)
      if (boxHover) {
        expect(Math.abs(boxHover.width - boxBefore.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(boxHover.height - boxBefore.height)).toBeLessThanOrEqual(1);
      }
      if (boxAfter) {
        expect(Math.abs(boxAfter.width - boxBefore.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(boxAfter.height - boxBefore.height)).toBeLessThanOrEqual(1);
      }
      // Main container X must remain stable (no horizontal layout shift)
      if (mainBoxBefore && mainBoxAfter) {
        expect(Math.abs(mainBoxAfter.x - mainBoxBefore.x)).toBeLessThanOrEqual(1);
      }

      // Computed transform must be identity or a pure translate (no scale)
      const transform = await item.evaluate((el) => getComputedStyle(el).transform);
      if (transform && transform !== "none") {
        // matrix(a, b, c, d, tx, ty) — a and d are X/Y scale; must be 1
        const m = transform.match(/matrix\(([^)]+)\)/);
        if (m) {
          const [a, , , d] = m[1].split(",").map((v) => parseFloat(v.trim()));
          expect(Math.abs(a - 1)).toBeLessThan(0.02);
          expect(Math.abs(d - 1)).toBeLessThan(0.02);
        }
      }
    }
  });
});
