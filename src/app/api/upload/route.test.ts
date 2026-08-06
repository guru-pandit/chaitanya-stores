// The default jsdom test environment provides its own `File`/`FormData`
// globals, distinct (cross-realm) from the undici-backed implementations
// Next's `NextRequest.formData()` parses multipart bodies into — an
// `instanceof File` check in the route would spuriously fail under jsdom
// even though the real Next.js runtime (no jsdom involved) uses undici
// consistently on both sides. This suite exercises real multipart
// FormData/File payloads (unlike this project's other route tests, which
// only send JSON), so it opts into the `node` environment to match
// production's File realm.
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { saveUploadedImage, deleteUploadedImage, UploadError } from "@/lib/upload";
import { uploadRateLimiter } from "@/lib/rate-limit";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/upload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upload")>("@/lib/upload");
  return { ...actual, saveUploadedImage: vi.fn(), deleteUploadedImage: vi.fn() };
});
// Session-keyed and shared with POST /api/upload/video (src/lib/rate-limit.ts)
// — mocked here for the same reason as src/app/api/contact/route.test.ts:
// an explicit, order-independent per-test outcome instead of relying on the
// real fixed-window counter across every test in this file.
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return { ...actual, uploadRateLimiter: { check: vi.fn() } };
});

// `auth` is overloaded (plain session lookup vs. middleware-wrapping form),
// which defeats vi.mocked()'s inference — cast to the simple async-fn shape
// this route actually calls it as.
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockSaveUploadedImage = saveUploadedImage as unknown as ReturnType<typeof vi.fn>;
const mockDeleteUploadedImage = deleteUploadedImage as unknown as ReturnType<typeof vi.fn>;
const mockRateLimiterCheck = uploadRateLimiter.check as unknown as ReturnType<typeof vi.fn>;

function deleteRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/upload", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function postRequest(file: File | null, headers: Record<string, string> = {}) {
  const formData = new FormData();
  if (file) formData.set("file", file);
  return new NextRequest("http://localhost/api/upload", {
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
  mockSaveUploadedImage.mockReset();
  mockDeleteUploadedImage.mockReset();
  mockRateLimiterCheck.mockReset();
  mockRateLimiterCheck.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
});

describe("POST /api/upload", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const file = new File(["data"], "a.jpg", { type: "image/jpeg" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(401);
    expect(mockSaveUploadedImage).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-origin request (CSRF backstop), before checking the rate limit", async () => {
    authed();
    const file = new File(["data"], "a.jpg", { type: "image/jpeg" });

    const res = await POST(postRequest(file, { origin: "https://evil.example.com" }));

    expect(res.status).toBe(403);
    expect(mockRateLimiterCheck).not.toHaveBeenCalled();
    expect(mockSaveUploadedImage).not.toHaveBeenCalled();
  });

  // Phase 4 audit finding #6 — no rate/quota limit on file uploads
  // previously allowed ~1.9GB/min from one authenticated session.
  it("returns 429 with a Retry-After header when the rate limiter rejects the request", async () => {
    authed();
    mockRateLimiterCheck.mockReturnValue({ allowed: false, retryAfterSeconds: 120 });
    const file = new File(["data"], "a.jpg", { type: "image/jpeg" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(mockSaveUploadedImage).not.toHaveBeenCalled();
  });

  it("keys the rate limiter by the session user's email", async () => {
    authed();
    const file = new File(["data"], "a.jpg", { type: "image/jpeg" });
    mockSaveUploadedImage.mockResolvedValueOnce("/uploads/a.jpg");

    await POST(postRequest(file));

    expect(mockRateLimiterCheck).toHaveBeenCalledWith("admin@example.com");
  });

  it("returns 400 when no file is provided", async () => {
    authed();
    const res = await POST(postRequest(null));
    expect(res.status).toBe(400);
    expect(mockSaveUploadedImage).not.toHaveBeenCalled();
  });

  it("returns 400 (not a raw 500) when saveUploadedImage rejects with an UploadError", async () => {
    authed();
    mockSaveUploadedImage.mockRejectedValueOnce(new UploadError("File too large. Maximum size is 5MB."));
    const file = new File(["data"], "a.jpg", { type: "image/jpeg" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("File too large. Maximum size is 5MB.");
  });

  it("returns 201 with the saved path on success", async () => {
    authed();
    mockSaveUploadedImage.mockResolvedValueOnce("/uploads/a1b2c3.jpg");
    const file = new File(["data"], "a.jpg", { type: "image/jpeg" });

    const res = await POST(postRequest(file));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ path: "/uploads/a1b2c3.jpg" });
  });
});

describe("DELETE /api/upload", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(deleteRequest({ path: "/uploads/a.jpg" }));

    expect(res.status).toBe(401);
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("returns 400 when the body has no path", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);

    const res = await DELETE(deleteRequest({}));

    expect(res.status).toBe(400);
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("returns 400 when deleteUploadedImage rejects an invalid path", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockDeleteUploadedImage.mockRejectedValueOnce(new UploadError("Invalid upload path."));

    const res = await DELETE(deleteRequest({ path: "/etc/passwd" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid upload path.");
  });

  it("returns 204 on successful delete", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockDeleteUploadedImage.mockResolvedValueOnce(undefined);

    const res = await DELETE(deleteRequest({ path: "/uploads/a.jpg" }));

    expect(res.status).toBe(204);
    expect(deleteUploadedImage).toHaveBeenCalledWith("/uploads/a.jpg");
  });
});
