import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("emits structured JSON for info", () => {
    logger.info("test message", { key: "value" });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = JSON.parse((console.log as any).mock.calls[0][0]);
    expect(output.level).toBe("info");
    expect(output.message).toBe("test message");
    expect(output.context.key).toBe("value");
    expect(output.timestamp).toBeDefined();
  });

  it("emits to console.error for error level", () => {
    logger.error("failure", { code: 500 });
    expect(console.error).toHaveBeenCalledTimes(1);
    const output = JSON.parse((console.error as any).mock.calls[0][0]);
    expect(output.level).toBe("error");
  });

  it("emits to console.warn for warn level", () => {
    logger.warn("attention");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
