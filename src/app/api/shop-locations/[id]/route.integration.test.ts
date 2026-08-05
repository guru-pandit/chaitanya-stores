// @vitest-environment node
import { describe, it, expect } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

function validLocationBody(overrides: Record<string, unknown> = {}) {
  return {
    name: unique("Test Shop"),
    address: "123 Test Street, Pune",
    phone: "9999999999",
    whatsappNumber: "919999999999",
    email: "shop@example.com",
    isPrimary: false,
    ...overrides,
  };
}

describe("GET /api/shop-locations/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/shop-locations/anything", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent id", async () => {
    const res = await apiFetch("/api/shop-locations/does-not-exist-xyz");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});

describe("PATCH /api/shop-locations/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson(
      "/api/shop-locations/anything",
      validLocationBody(),
      { method: "PATCH" },
      { auth: false }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await apiJson(
      "/api/shop-locations/anything",
      { ...validLocationBody(), phone: "" },
      { method: "PATCH" }
    );
    expect(res.status).toBe(400);
  });

  // Unlike products/[id] and categories/[id], this route's PATCH does check
  // existence (findUnique) before touching the row — a real 404, not the
  // uncaught-P2025-as-500 bug seen elsewhere.
  it("returns 404 (not 500) for a nonexistent id — correctly guarded, unlike products/categories", async () => {
    const res = await apiJson(
      "/api/shop-locations/does-not-exist-xyz",
      validLocationBody(),
      { method: "PATCH" }
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/shop-locations/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/shop-locations/anything", { method: "DELETE" }, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 404 (not 500) for a nonexistent id", async () => {
    const res = await apiFetch("/api/shop-locations/does-not-exist-xyz", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("creates a non-primary location and deletes it cleanly (200, then 404 on re-fetch)", async () => {
    // Requires at least one existing primary location to not be the very
    // first row created (see route.integration.test.ts for the "first
    // location forced primary" rule) — ensure one exists first.
    const listRes = await apiFetch("/api/shop-locations?limit=1");
    const hasAny = (await listRes.json()).total > 0;
    if (!hasAny) {
      const bootstrap = await apiJson("/api/shop-locations", validLocationBody());
      expect(bootstrap.status).toBe(201);
    }

    const createRes = await apiJson("/api/shop-locations", validLocationBody({ isPrimary: false }));
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.isPrimary).toBe(false);

    const deleteRes = await apiFetch(`/api/shop-locations/${created.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.json()).toEqual({ success: true });

    const getAfter = await apiFetch(`/api/shop-locations/${created.id}`);
    expect(getAfter.status).toBe(404);
  });
});
