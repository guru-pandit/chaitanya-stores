// @vitest-environment node
import { describe, it, expect, afterAll } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

const createdIds: string[] = [];

afterAll(async () => {
  for (const id of createdIds) {
    await apiFetch(`/api/festival-banners/${id}`, { method: "DELETE" }).catch(() => {});
  }
});

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

describe("GET /api/festival-banners (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/festival-banners", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns a paginated { items, total } shape", async () => {
    const res = await apiFetch("/api/festival-banners");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });
});

describe("POST /api/festival-banners (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson("/api/festival-banners", validBannerBody(), {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body (missing label)", async () => {
    const res = await apiJson("/api/festival-banners", { ...validBannerBody(), label: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 on an invalid mediaType enum value", async () => {
    const res = await apiJson("/api/festival-banners", { ...validBannerBody(), mediaType: "AUDIO" });
    expect(res.status).toBe(400);
  });

  it("creates and returns 201; zero-active is a valid resting state", async () => {
    const res = await apiJson("/api/festival-banners", validBannerBody({ isActive: false }));
    expect(res.status).toBe(201);
    const body = await res.json();
    createdIds.push(body.id);
    expect(body.isActive).toBe(false);
  });

  // Zod gap flagged in phase0-attack-surface.md §4/§6:
  // festivalBannerSchema.mediaPath is "any non-empty string", not
  // constrained to /uploads/... — confirmed exploitable: an off-site URL is
  // accepted and persisted as-is.
  it("BUG: accepts a mediaPath that isn't under /uploads/ (off-site URL)", async () => {
    const res = await apiJson(
      "/api/festival-banners",
      validBannerBody({ mediaPath: "https://evil.example.com/tracker.png" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    createdIds.push(body.id);
    expect(body.mediaPath).toBe("https://evil.example.com/tracker.png");
  });
});

describe('"at most one active" invariant across create/update (integration)', () => {
  it("promoting a second banner to active demotes the first", async () => {
    const aRes = await apiJson("/api/festival-banners", validBannerBody({ isActive: true }));
    expect(aRes.status).toBe(201);
    const a = await aRes.json();
    createdIds.push(a.id);
    expect(a.isActive).toBe(true);

    const bRes = await apiJson("/api/festival-banners", validBannerBody({ isActive: true }));
    expect(bRes.status).toBe(201);
    const b = await bRes.json();
    createdIds.push(b.id);
    expect(b.isActive).toBe(true);

    const aAfter = await apiFetch(`/api/festival-banners/${a.id}`);
    expect((await aAfter.json()).isActive).toBe(false);

    // Both can be inactive at once (unlike ShopLocation.isPrimary) — no
    // "at least one" guard.
    const deactivateB = await apiJson(
      `/api/festival-banners/${b.id}`,
      validBannerBody({ isActive: false }),
      { method: "PATCH" }
    );
    expect(deactivateB.status).toBe(200);
    expect((await deactivateB.json()).isActive).toBe(false);
  });
});
