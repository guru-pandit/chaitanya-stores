import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { logger } from "@/lib/logger";
import { clientErrorRateLimiter } from "@/lib/rate-limit";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

// Same rationale as src/app/api/contact/route.test.ts — mock .check() so
// each test's rate-limit outcome is explicit rather than order-dependent
// on the real module-level singleton's shared bucket.
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return { ...actual, clientErrorRateLimiter: { check: vi.fn() } };
});

const mockLogger = logger as unknown as { error: ReturnType<typeof vi.fn> };
const mockRateLimiterCheck = clientErrorRateLimiter.check as unknown as ReturnType<typeof vi.fn>;

const validBody = {
  message: "Cannot read properties of undefined",
  stack: "TypeError: ...\n  at Component",
  digest: "1234567890",
  url: "https://example.com/products/foo",
};

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/log-client-error", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("POST /api/log-client-error", () => {
  beforeEach(() => {
    mockLogger.error.mockReset();
    mockRateLimiterCheck.mockReset();
    mockRateLimiterCheck.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
  });

  // Security review finding (Phase 4 review-implementation pass): this
  // route was missed by the original CSRF/rate-limit rollout despite being
  // a public mutating endpoint.
  it("returns 403 for a cross-origin request (CSRF backstop), before touching the rate limiter", async () => {
    const res = await POST(postRequest(validBody, { origin: "https://evil.example.com" }));

    expect(res.status).toBe(403);
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockRateLimiterCheck).not.toHaveBeenCalled();
  });

  it("returns 429 with a Retry-After header when the rate limiter rejects the request", async () => {
    mockRateLimiterCheck.mockReturnValue({ allowed: false, retryAfterSeconds: 12 });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("logs the error and returns 204 for a valid body", async () => {
    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(204);
    expect(mockLogger.error).toHaveBeenCalledWith("Client-side error", validBody);
  });

  it("accepts a body without the optional stack/digest fields", async () => {
    const res = await POST(postRequest({ message: "oops", url: "https://example.com/" }));

    expect(res.status).toBe(204);
  });

  it("returns 400 with field errors when message is missing", async () => {
    const res = await POST(postRequest({ url: "https://example.com/" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.message).toBeDefined();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("returns a clean 400 on malformed JSON instead of a raw 500", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/log-client-error", {
        method: "POST",
        body: "{bad json",
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(400);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
