// @vitest-environment node
import { describe, it, expect, afterAll } from "vitest";
import { apiFetch, apiJson } from "@/test/apiIntegrationHelpers";

let originalHeroImages: string;

describe("GET /api/settings (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/settings", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 200 with a singleton row, auto-creating it on first read", async () => {
    const res = await apiFetch("/api/settings");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("heroImages");
    originalHeroImages = body.heroImages;
  });

  it("GET is idempotent — always returns the same singleton id, not a new row each time", async () => {
    const first = await (await apiFetch("/api/settings")).json();
    const second = await (await apiFetch("/api/settings")).json();
    expect(first.id).toBe(second.id);
  });
});

describe("PATCH /api/settings (integration)", () => {
  afterAll(async () => {
    // Restore whatever heroImages existed before this test file ran.
    if (originalHeroImages !== undefined) {
      await apiJson(
        "/api/settings",
        { heroImages: JSON.parse(originalHeroImages) },
        { method: "PATCH" }
      );
    }
  });

  it("returns 401 without a session", async () => {
    const res = await apiJson("/api/settings", { heroImages: [] }, { method: "PATCH" }, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 400 when heroImages is not an array of strings", async () => {
    const res = await apiJson("/api/settings", { heroImages: "not-an-array" }, { method: "PATCH" });
    expect(res.status).toBe(400);
  });

  it("updates heroImages and persists the change across GETs", async () => {
    const paths = ["/uploads/hero-1.jpg", "/uploads/hero-2.jpg"];
    const patchRes = await apiJson("/api/settings", { heroImages: paths }, { method: "PATCH" });
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(JSON.parse(patched.heroImages)).toEqual(paths);

    const getRes = await apiFetch("/api/settings");
    const body = await getRes.json();
    expect(JSON.parse(body.heroImages)).toEqual(paths);
  });

  // Finding #7 fix: siteSettingsSchema.heroImages is now constrained via
  // uploadPathSchema (/uploads/... only) with a MAX_HERO_IMAGES array cap —
  // a large array of arbitrary, non-URL strings is rejected with a clean
  // 400 instead of being persisted.
  it("rejects an oversized heroImages array of arbitrary, non-URL strings", async () => {
    const junk = Array.from({ length: 500 }, (_, i) => `not-a-path-${i}`);
    const res = await apiJson("/api/settings", { heroImages: junk }, { method: "PATCH" });
    expect(res.status).toBe(400);
  });
});
