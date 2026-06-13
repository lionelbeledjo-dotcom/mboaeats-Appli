import { describe, it, expect } from "vitest";
import { SERVER_CONFIG } from "./server-config";

describe("SERVER_CONFIG", () => {
  it("has valid OTP configuration", () => {
    expect(SERVER_CONFIG.otp.ttlSeconds).toBeGreaterThan(0);
    expect(SERVER_CONFIG.otp.maxAttempts).toBeGreaterThan(0);
    expect(SERVER_CONFIG.otp.cooldownSeconds).toBeGreaterThan(0);
    expect(SERVER_CONFIG.otp.digits).toBe(6);
  });

  it("has valid rate limit configuration", () => {
    expect(SERVER_CONFIG.rateLimit.loginPerIp.limit).toBe(10);
    expect(SERVER_CONFIG.rateLimit.loginPerIp.windowSeconds).toBe(900);
    expect(SERVER_CONFIG.rateLimit.paymentInitiate.limit).toBe(5);
  });

  it("has valid order limits", () => {
    expect(SERVER_CONFIG.order.maxItems).toBe(50);
    expect(SERVER_CONFIG.order.maxQty).toBe(50);
    expect(SERVER_CONFIG.order.maxTotalXaf).toBe(5_000_000);
  });

  it("has valid payment limits", () => {
    expect(SERVER_CONFIG.payments.maxAmountXaf).toBe(10_000_000);
  });

  it("2FA session TTL is reasonable (4-24h)", () => {
    const hours = SERVER_CONFIG.superadmin2fa.sessionTtlHours;
    expect(hours).toBeGreaterThanOrEqual(4);
    expect(hours).toBeLessThanOrEqual(24);
  });
});
