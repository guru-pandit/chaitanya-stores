import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  RateLimiter,
  getClientIp,
  rateLimitResponse,
  contactRateLimiter,
  uploadRateLimiter,
} from "./rate-limit";

describe("RateLimiter", () => {
  const originalEnv = process.env.RATE_LIMIT_DISABLED;

  beforeEach(() => {
    vi.useFakeTimers();
    delete process.env.RATE_LIMIT_DISABLED;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalEnv === undefined) delete process.env.RATE_LIMIT_DISABLED;
    else process.env.RATE_LIMIT_DISABLED = originalEnv;
  });

  it("allows requests up to the limit within the window", () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.check("key-a").allowed).toBe(true);
    expect(limiter.check("key-a").allowed).toBe(true);
    expect(limiter.check("key-a").allowed).toBe(true);
  });

  it("blocks the request that exceeds the limit within the window", () => {
    const limiter = new RateLimiter(2, 60_000);
    limiter.check("key-b");
    limiter.check("key-b");
    const result = limiter.check("key-b");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("resets the count once the window elapses", () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.check("key-c").allowed).toBe(true);
    expect(limiter.check("key-c").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.check("key-c").allowed).toBe(true);
  });

  it("bypasses the limit entirely when RATE_LIMIT_DISABLED=true", () => {
    process.env.RATE_LIMIT_DISABLED = "true";
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.check("key-d").allowed).toBe(true);
    expect(limiter.check("key-d").allowed).toBe(true);
    expect(limiter.check("key-d").allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("reads the first entry from x-forwarded-for", () => {
    const req = new NextRequest("http://localhost/api/contact", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new NextRequest("http://localhost/api/contact", {
      headers: { "x-real-ip": "203.0.113.9" },
    });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const req = new NextRequest("http://localhost/api/contact");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with a Retry-After header and a generic body", async () => {
    const res = rateLimitResponse(42);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(await res.json()).toEqual({ error: "Too many requests. Please try again shortly." });
  });
});

describe("exported limiter instances", () => {
  it("contactRateLimiter and uploadRateLimiter are independent RateLimiter instances", () => {
    expect(contactRateLimiter).toBeInstanceOf(RateLimiter);
    expect(uploadRateLimiter).toBeInstanceOf(RateLimiter);
    expect(contactRateLimiter).not.toBe(uploadRateLimiter);
  });
});
