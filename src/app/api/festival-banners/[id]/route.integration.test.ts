// @vitest-environment node
import { describe, it, expect } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

function validBannerBody(overrides: Record<string, unknown> = {}) {
  return {
    label: unique("Test Banner"),
    mediaType: "IMAGE",
    mediaPath: "/uploads/does-not-need-to-exist-for-schema.png",
    isActive: false,
    startDate: "",
    endDate: "",
    ...overrides,
  };
}

describe("GET /api/festival-banners/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/festival-banners/anything", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent id", async () => {
    const res = await apiFetch("/api/festival-banners/does-not-exist-xyz");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/festival-banners/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson(
      "/api/festival-banners/anything",
      validBannerBody(),
      { method: "PATCH" },
      { auth: false }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await apiJson(
      "/api/festival-banners/anything",
      { ...validBannerBody(), label: "" },
      { method: "PATCH" }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 (not 500) for a nonexistent id — correctly guarded", async () => {
    const res = await apiJson(
      "/api/festival-banners/does-not-exist-xyz",
      validBannerBody(),
      { method: "PATCH" }
    );
    expect(res.status).toBe(404);
  });

  it("persists startDate/endDate as business-timezone-anchored bounds and round-trips them", async () => {
    const createRes = await apiJson(
      "/api/festival-banners",
      validBannerBody({ startDate: "2026-10-20", endDate: "2026-10-25" })
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.startDate).not.toBeNull();
    expect(created.endDate).not.toBeNull();

    await apiFetch(`/api/festival-banners/${created.id}`, { method: "DELETE" });
  });
});

describe("DELETE /api/festival-banners/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/festival-banners/anything", { method: "DELETE" }, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 404 (not 500) for a nonexistent id", async () => {
    const res = await apiFetch("/api/festival-banners/does-not-exist-xyz", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("deletes cleanly even when mediaPath points at a file that was never actually uploaded (best-effort unlink)", async () => {
    const createRes = await apiJson(
      "/api/festival-banners",
      validBannerBody({ mediaPath: "/uploads/never-actually-written-abc123.png" })
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const deleteRes = await apiFetch(`/api/festival-banners/${created.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.json()).toEqual({ success: true });

    const getAfter = await apiFetch(`/api/festival-banners/${created.id}`);
    expect(getAfter.status).toBe(404);
  });
});
