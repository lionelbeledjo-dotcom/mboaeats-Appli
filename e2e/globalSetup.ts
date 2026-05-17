import { chromium, request, type FullConfig } from "@playwright/test";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const STORAGE = "e2e/.auth/admin.json";

export default async function globalSetup(_config: FullConfig) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 8080}`;

  mkdirSync(dirname(STORAGE), { recursive: true });

  if (!email || !password) {
    // Write empty storage so tests load — they'll skip/fail gracefully.
    if (!existsSync(STORAGE)) {
      writeFileSync(STORAGE, JSON.stringify({ cookies: [], origins: [] }));
    }
    console.warn(
      "[e2e] E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set — admin tests will fail. Set them in your env."
    );
    return;
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${baseURL}/admin/login`, { waitUntil: "domcontentloaded" });

  // Email (input type=text with autocomplete=username) + password
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /connecter|connexion|sign in/i }).click();

  // Wait until we land on /admin (not /admin/login)
  await page.waitForURL((url) => url.pathname === "/admin" || url.pathname.startsWith("/admin/"), {
    timeout: 30_000,
  });
  // Sanity: sidebar visible
  await page.waitForSelector("aside, [data-sidebar], nav", { timeout: 10_000 });

  await ctx.storageState({ path: STORAGE });
  await browser.close();
}
