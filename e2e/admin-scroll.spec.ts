import { test, expect, type Page } from "@playwright/test";

const ADMIN_ROUTES = [
  "/admin",
  "/admin/commissions",
  "/admin/zones",
  "/admin/restaurants",
  "/admin/menus",
  "/admin/livreurs",
  "/admin/litiges",
  "/admin/clients",
  "/admin/commandes",
  "/admin/parametres",
  "/admin/logs",
];

// Find the element that actually scrolls (window or an inner overflow-y:auto/scroll container).
async function getScrollTarget(page: Page) {
  return await page.evaluate(() => {
    function isScrollable(el: Element) {
      const cs = getComputedStyle(el);
      const oy = cs.overflowY;
      return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1;
    }
    // Prefer window
    if (document.documentElement.scrollHeight > window.innerHeight + 1) return "window";
    // Otherwise find the nearest scrollable descendant of <main>
    const main = document.querySelector("main") ?? document.body;
    const all = main.querySelectorAll<HTMLElement>("*");
    for (const el of [main as HTMLElement, ...Array.from(all)]) {
      if (isScrollable(el)) return "selector:" + cssPath(el);
    }
    return "none";

    function cssPath(el: Element): string {
      const parts: string[] = [];
      let cur: Element | null = el;
      while (cur && cur !== document.body && parts.length < 6) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) {
          part += "#" + cur.id;
          parts.unshift(part);
          break;
        }
        const sib = cur.parentElement
          ? Array.from(cur.parentElement.children).filter((c) => c.tagName === cur!.tagName)
          : [];
        if (sib.length > 1) part += `:nth-of-type(${sib.indexOf(cur) + 1})`;
        parts.unshift(part);
        cur = cur.parentElement;
      }
      return parts.join(" > ");
    }
  });
}

async function getScrollTop(page: Page, target: string): Promise<number> {
  if (target === "window") return await page.evaluate(() => window.scrollY);
  if (target.startsWith("selector:")) {
    const sel = target.slice("selector:".length);
    return await page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement | null;
      return el ? el.scrollTop : 0;
    }, sel);
  }
  return 0;
}

test.describe("Admin pages — mouse wheel scrolling", () => {
  for (const path of ADMIN_ROUTES) {
    test(`scrolls with wheel on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      // Wait for main content
      await page.waitForSelector("main", { timeout: 15_000 });
      // Pad content so we're sure something is scrollable
      await page.evaluate(() => {
        const pad = document.createElement("div");
        pad.style.height = "2000px";
        pad.setAttribute("data-e2e-pad", "1");
        (document.querySelector("main") ?? document.body).appendChild(pad);
      });

      const target = await getScrollTarget(page);
      expect(target, `no scrollable container on ${path}`).not.toBe("none");

      const before = await getScrollTop(page, target);
      // Move mouse over content and wheel
      await page.mouse.move(900, 400);
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(150);
      const after = await getScrollTop(page, target);

      expect(after, `wheel did not scroll on ${path} (before=${before}, after=${after})`).toBeGreaterThan(
        before
      );

      // No ancestor of <main> blocks vertical scroll with overflow:hidden
      const blocker = await page.evaluate(() => {
        const main = document.querySelector("main");
        if (!main) return null;
        let el: HTMLElement | null = main.parentElement;
        while (el && el !== document.documentElement) {
          const oy = getComputedStyle(el).overflowY;
          if (oy === "hidden") return el.tagName + "." + el.className;
          el = el.parentElement;
        }
        return null;
      });
      expect(blocker, `ancestor blocks vertical scroll: ${blocker}`).toBeNull();
    });
  }
});
