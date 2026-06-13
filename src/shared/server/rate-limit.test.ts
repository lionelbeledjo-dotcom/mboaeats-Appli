import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

import { enforceRateLimit } from "./rate-limit";

const mockRequest = {
  headers: { get: (name: string) => (name === "x-forwarded-for" ? "192.168.1.1" : null) },
};

describe("enforceRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows request when under limit", async () => {
    await expect(
      enforceRateLimit("test_bucket", mockRequest, { limit: 10, windowSeconds: 60 }),
    ).resolves.toBeUndefined();
  });

  it("throws 429 when limit exceeded", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ count: 10, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    } as any);

    try {
      await enforceRateLimit("test_bucket", mockRequest, { limit: 10, windowSeconds: 60 });
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(Response);
      expect(e.status).toBe(429);
    }
  });

  it("fails closed on critical buckets when DB is down", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ count: null, error: { message: "DB down" } })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    } as any);

    try {
      await enforceRateLimit("login_pwd", mockRequest, { limit: 10, windowSeconds: 60 });
      expect.fail("Should have thrown for critical bucket");
    } catch (e: any) {
      expect(e).toBeInstanceOf(Response);
      expect(e.status).toBe(429);
    }
  });

  it("fails open on non-critical buckets when DB is down", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ count: null, error: { message: "DB down" } })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    } as any);

    await expect(
      enforceRateLimit("non_critical", mockRequest, { limit: 10, windowSeconds: 60 }),
    ).resolves.toBeUndefined();
  });
});
