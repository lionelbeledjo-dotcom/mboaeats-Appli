import { test, expect } from "@playwright/test";

test.describe("Health endpoint", () => {
  test("GET /api/public/health returns JSON status", async ({ request }) => {
    const res = await request.get("/api/public/health");
    expect(res.status()).toBeLessThan(504);
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("checks");
  });
});
