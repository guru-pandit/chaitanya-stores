import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { contactRateLimiter } from "@/lib/rate-limit";

vi.mock("@/lib/prisma", () => ({
  prisma: { enquiry: { create: vi.fn() } },
}));

// The real contactRateLimiter is a module-level singleton shared across
// every test in this file (and, since it's IP-keyed and this suite never
// sends x-forwarded-for/x-real-ip, every request here shares the "unknown"
// bucket) — mocking `.check()` keeps each test's rate-limit outcome
// explicit and avoids order-dependent flakiness as more tests are added to
// this file over time.
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return { ...actual, contactRateLimiter: { check: vi.fn() } };
});

const mockPrisma = prisma as unknown as { enquiry: { create: ReturnType<typeof vi.fn> } };
const mockRateLimiterCheck = contactRateLimiter.check as unknown as ReturnType<typeof vi.fn>;

const validBody = {
  name: "Asha",
  contactMethod: "asha@example.com",
  message: "Do you have sandalwood dhoop in stock?",
};

function postRequest(body: string | object, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

beforeEach(() => {
  mockPrisma.enquiry.create.mockReset();
  mockRateLimiterCheck.mockReset();
  // Default to "allowed" so tests that aren't specifically about rate
  // limiting don't need to know about it.
  mockRateLimiterCheck.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
});

describe("POST /api/contact", () => {
  it("returns 400 on invalid body", async () => {
    const res = await POST(postRequest({ ...validBody, message: "" }));
    expect(res.status).toBe(400);
    expect(mockPrisma.enquiry.create).not.toHaveBeenCalled();
  });

  it("returns a clean 400 on malformed JSON instead of a raw 500 — this endpoint is public/unauthenticated", async () => {
    const res = await POST(postRequest("{bad json"));
    expect(res.status).toBe(400);
    expect(mockPrisma.enquiry.create).not.toHaveBeenCalled();
  });

  it("creates the enquiry and returns 201 on a valid body", async () => {
    mockPrisma.enquiry.create.mockResolvedValueOnce({ id: "1", ...validBody });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(mockPrisma.enquiry.create).toHaveBeenCalledWith({ data: validBody });
  });

  // Phase 4 audit finding #4 — CSRF backstop. This is the one public,
  // unauthenticated mutating route in the app, so it's the highest-value
  // place to prove verifyCsrf is actually wired in (not just unit-tested in
  // isolation in src/lib/csrf.test.ts).
  it("returns 403 for a cross-origin request (CSRF backstop), before touching the DB or rate limiter", async () => {
    const res = await POST(postRequest(validBody, { origin: "https://evil.example.com" }));

    expect(res.status).toBe(403);
    expect(mockPrisma.enquiry.create).not.toHaveBeenCalled();
    expect(mockRateLimiterCheck).not.toHaveBeenCalled();
  });

  // Phase 4 audit finding #5 — no rate limiting previously allowed 60
  // concurrent requests to all succeed.
  it("returns 429 with a Retry-After header when the rate limiter rejects the request", async () => {
    mockRateLimiterCheck.mockReturnValue({ allowed: false, retryAfterSeconds: 37 });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("37");
    expect(mockPrisma.enquiry.create).not.toHaveBeenCalled();
  });
});
