import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 8080);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 700 },
    trace: "retain-on-failure",
    storageState: "e2e/.auth/admin.json",
  },
  globalSetup: "./e2e/globalSetup.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        port: PORT,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
