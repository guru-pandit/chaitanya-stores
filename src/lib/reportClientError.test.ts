import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportClientError } from "./reportClientError";

describe("reportClientError", () => {
  const originalSendBeacon = navigator.sendBeacon;
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    Object.defineProperty(navigator, "sendBeacon", {
      value: originalSendBeacon,
      configurable: true,
      writable: true,
    });
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses sendBeacon when available and it accepts the payload, without falling back to fetch", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true, writable: true });

    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    reportClientError(error);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0];
    expect(url).toBe("/api/log-client-error");
    expect(blob).toBeInstanceOf(Blob);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("falls back to fetch when sendBeacon rejects the payload (returns false)", () => {
    const sendBeacon = vi.fn().mockReturnValue(false);
    Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true, writable: true });

    reportClientError(new Error("boom"));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/log-client-error",
      expect.objectContaining({ method: "POST", keepalive: true })
    );
  });

  it("falls back to fetch when sendBeacon is unavailable", () => {
    Object.defineProperty(navigator, "sendBeacon", { value: undefined, configurable: true, writable: true });

    reportClientError(new Error("boom"));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/log-client-error",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends the error message, stack, digest, and current URL as the JSON body", () => {
    Object.defineProperty(navigator, "sendBeacon", { value: undefined, configurable: true, writable: true });
    const error = Object.assign(new Error("something broke"), { digest: "digest-1" });

    reportClientError(error);

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.message).toBe("something broke");
    expect(body.digest).toBe("digest-1");
    expect(body.url).toBe(window.location.href);
    expect(typeof body.stack).toBe("string");
  });

  it("never throws even if both sendBeacon and fetch are unavailable/throwing", () => {
    Object.defineProperty(navigator, "sendBeacon", {
      value: () => {
        throw new Error("sendBeacon exploded");
      },
      configurable: true,
      writable: true,
    });

    expect(() => reportClientError(new Error("boom"))).not.toThrow();
  });

  it("swallows a rejected fetch promise instead of producing an unhandled rejection", async () => {
    Object.defineProperty(navigator, "sendBeacon", { value: undefined, configurable: true, writable: true });
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    expect(() => reportClientError(new Error("boom"))).not.toThrow();
    // Let the fire-and-forget fetch promise's rejection handler run.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
