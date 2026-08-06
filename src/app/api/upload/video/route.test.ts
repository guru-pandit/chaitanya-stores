// See src/app/api/upload/route.test.ts's comment on why this suite opts
// into the `node` environment: it exercises real multipart FormData/File
// payloads, and jsdom's File class is a different realm than the
// undici-backed one NextRequest.formData() parses into.
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { auth } from "@/lib/auth";
import { saveUploadedVideo, UploadError } from "@/lib/upload";
import { uploadRateLimiter } from "@/lib/rate-limit";

// This file was missing entirely before the Phase 4 audit-fix commit
// (dff2cd4), even though this route gained CSRF verification and a
// session-keyed rate limit (shared with POST /api/upload — finding #6:
// ~1.9GB/min was previously possible from one authenticated session) in
// that commit. Mirrors src/app/api/upload/route.test.ts's POST coverage.

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/upload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upload")>("@/lib/upload");
  return { ...actual, saveUploadedVideo: vi.fn() };
});
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return { ...actual, uploadRateLimiter: { check: vi.fn() } };
});

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockSaveUploadedVideo = saveUploadedVideo as unknown as ReturnType<typeof vi.fn>;
const mockRateLimiterCheck = uploadRateLimiter.check as unknown as ReturnType<typeof vi.fn>;

function postRequest(file: File | null, headers: Record<string, string> = {}) {
  const formData = new FormData();
  if (file) formData.set("file", file);
  return new NextRequest("http://localhost/api/upload/video", {
    method: "POST",
    body: formData,
    headers,
  });
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1", email: "admin@example.com" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockSaveUploadedVideo.mockReset();
  mockRateLimiterCheck.mockReset();
  mockRateLimiterCheck.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
});

describe("POST /api/upload/video", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const file = new File(["data"], "a.mp4", { type: "video/mp4" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(401);
    expect(mockSaveUploadedVideo).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-origin request (CSRF backstop), before checking the rate limit", async () => {
    authed();
    const file = new File(["data"], "a.mp4", { type: "video/mp4" });

    const res = await POST(postRequest(file, { origin: "https://evil.example.com" }));

    expect(res.status).toBe(403);
    expect(mockRateLimiterCheck).not.toHaveBeenCalled();
    expect(mockSaveUploadedVideo).not.toHaveBeenCalled();
  });

  it("returns 429 with a Retry-After header when the rate limiter rejects the request", async () => {
    authed();
    mockRateLimiterCheck.mockReturnValue({ allowed: false, retryAfterSeconds: 90 });
    const file = new File(["data"], "a.mp4", { type: "video/mp4" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("90");
    expect(mockSaveUploadedVideo).not.toHaveBeenCalled();
  });

  it("shares the rate-limit bucket key (session user's email) with POST /api/upload", async () => {
    authed();
    const file = new File(["data"], "a.mp4", { type: "video/mp4" });
    mockSaveUploadedVideo.mockResolvedValueOnce("/uploads/a.mp4");

    await POST(postRequest(file));

    expect(mockRateLimiterCheck).toHaveBeenCalledWith("admin@example.com");
  });

  it("returns 400 when no file is provided", async () => {
    authed();
    const res = await POST(postRequest(null));
    expect(res.status).toBe(400);
    expect(mockSaveUploadedVideo).not.toHaveBeenCalled();
  });

  it("returns 400 (not a raw 500) when saveUploadedVideo rejects with an UploadError", async () => {
    authed();
    mockSaveUploadedVideo.mockRejectedValueOnce(
      new UploadError("File too large. Maximum size is 20MB.")
    );
    const file = new File(["data"], "a.mp4", { type: "video/mp4" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("File too large. Maximum size is 20MB.");
  });

  it("returns 201 with the saved path on success", async () => {
    authed();
    mockSaveUploadedVideo.mockResolvedValueOnce("/uploads/a1b2c3.mp4");
    const file = new File(["data"], "a.mp4", { type: "video/mp4" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ path: "/uploads/a1b2c3.mp4" });
  });
});
