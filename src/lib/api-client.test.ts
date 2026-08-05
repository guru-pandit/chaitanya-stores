import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, ApiError } from "./api-client";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns the parsed body on a successful response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(200, { id: "1" }));
    await expect(apiFetch("/api/test")).resolves.toEqual({ id: "1" });
  });

  it("throws an ApiError with the plain string message when the API returns one", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" }));
    await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
  });

  it("attaches fieldErrors from a Zod-flatten-shaped error, for the caller to map onto form fields", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(400, { error: { formErrors: [], fieldErrors: { name: ["Name is required"] } } })
    );

    try {
      await apiFetch("/api/test");
      expect.unreachable("apiFetch should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).fieldErrors).toEqual({ name: ["Name is required"] });
      expect((err as ApiError).message).toBe("Name is required");
    }
  });

  it("attaches fieldErrors from a hand-built conflict error (e.g. a 409 slug conflict)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(409, { error: { fieldErrors: { slug: ["Slug already in use"] } } })
    );

    try {
      await apiFetch("/api/test");
      expect.unreachable("apiFetch should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).fieldErrors).toEqual({ slug: ["Slug already in use"] });
    }
  });

  it("prefers formErrors over a field message when both are present", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(400, {
        error: { formErrors: ["Something is wrong overall"], fieldErrors: { name: ["bad"] } },
      })
    );
    await expect(apiFetch("/api/test")).rejects.toThrow("Something is wrong overall");
  });

  it("falls back to a generic message when the body has no usable error shape", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(500, {}));
    await expect(apiFetch("/api/test")).rejects.toThrow("Something went wrong");
  });

  it("falls back to a generic message when the body isn't valid JSON", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response("not json", { status: 500 }));
    await expect(apiFetch("/api/test")).rejects.toThrow("Something went wrong");
  });
});
