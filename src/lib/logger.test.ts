import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes error()/warn() as JSON to stderr, info() to stdout", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.error("boom");
    logger.warn("careful");
    logger.info("fyi");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("includes timestamp, level, and message in a single JSON line", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("something broke", { route: "/api/products" });

    const line = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "error", message: "something broke", route: "/api/products" });
    expect(typeof line.timestamp).toBe("string");
    expect(new Date(line.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("serializes an Error in context to {name, message, stack} instead of {}", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("request failed", { error: new TypeError("nope") });

    const line = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(line.error).toMatchObject({ name: "TypeError", message: "nope" });
    expect(typeof line.error.stack).toBe("string");
  });

  it("passes through non-Error values in the error field unchanged", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("weird failure", { error: "just a string" });

    const line = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(line.error).toBe("just a string");
  });
});
