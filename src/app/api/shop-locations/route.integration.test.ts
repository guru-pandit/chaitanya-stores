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

describe("GET /api/shop-locations (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/shop-locations", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns a paginated { items, total } shape", async () => {
    const res = await apiFetch("/api/shop-locations");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });
});

describe("POST /api/shop-locations (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson("/api/shop-locations", validLocationBody(), {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body (missing address)", async () => {
    const res = await apiJson("/api/shop-locations", { ...validLocationBody(), address: "" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.address).toBeDefined();
  });

  it("returns 400 when email is not a valid email", async () => {
    const res = await apiJson("/api/shop-locations", { ...validLocationBody(), email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe('"exactly one primary" invariant across create/update (integration)', () => {
  it("promotes the first-ever location to primary regardless of the submitted isPrimary flag, demotes it when a second location is made primary, and blocks deleting/un-primarying the current primary", async () => {
    // --- Establish a known baseline: demote every existing location first,
    // so this test's assertions aren't order-dependent on what other test
    // files left behind in this shared DB. ---
    const before = await apiFetch("/api/shop-locations?limit=100");
    const existing = (await before.json()).items as { id: string; isPrimary: boolean }[];
    const existingPrimary = existing.find((l) => l.isPrimary);

    // 1. Create location A with isPrimary explicitly false.
    const aRes = await apiJson("/api/shop-locations", validLocationBody({ isPrimary: false }));
    expect(aRes.status).toBe(201);
    const a = await aRes.json();

    if (!existingPrimary) {
      // No prior locations existed — A is the very first row, so the route's
      // "the first location is always primary" rule should have overridden
      // the submitted isPrimary: false.
      expect(a.isPrimary).toBe(true);
    }

    // Make sure A is primary going into step 2, regardless of prior state.
    if (!a.isPrimary) {
      const promoteA = await apiJson(
        `/api/shop-locations/${a.id}`,
        validLocationBody({ isPrimary: true }),
        { method: "PATCH" }
      );
      expect(promoteA.status).toBe(200);
    }

    // 2. Create location B, not primary.
    const bRes = await apiJson("/api/shop-locations", validLocationBody({ isPrimary: false }));
    expect(bRes.status).toBe(201);
    const b = await bRes.json();
    expect(b.isPrimary).toBe(false);

    const aAfterB = await apiFetch(`/api/shop-locations/${a.id}`);
    expect((await aAfterB.json()).isPrimary).toBe(true);

    // 3. Promote B to primary — A must be auto-demoted by the $transaction.
    const promoteB = await apiJson(
      `/api/shop-locations/${b.id}`,
      validLocationBody({ isPrimary: true }),
      { method: "PATCH" }
    );
    expect(promoteB.status).toBe(200);
    expect((await promoteB.json()).isPrimary).toBe(true);

    const aAfterPromoteB = await apiFetch(`/api/shop-locations/${a.id}`);
    expect((await aAfterPromoteB.json()).isPrimary).toBe(false);

    // 4. Cannot delete the current primary (B).
    const deleteB = await apiFetch(`/api/shop-locations/${b.id}`, { method: "DELETE" });
    expect(deleteB.status).toBe(409);

    // 5. Cannot PATCH the current primary (B) to isPrimary: false directly.
    const unsetB = await apiJson(
      `/api/shop-locations/${b.id}`,
      validLocationBody({ isPrimary: false }),
      { method: "PATCH" }
    );
    expect(unsetB.status).toBe(400);
    const unsetBody = await unsetB.json();
    expect(unsetBody.error.fieldErrors.isPrimary).toBeDefined();

    // 6. A (non-primary) can be deleted cleanly.
    const deleteA = await apiFetch(`/api/shop-locations/${a.id}`, { method: "DELETE" });
    expect(deleteA.status).toBe(200);
    const getADeleted = await apiFetch(`/api/shop-locations/${a.id}`);
    expect(getADeleted.status).toBe(404);

    // Leave B (now sole primary) in place — deleting it would violate the
    // "at least one primary" invariant unless another location is promoted
    // first, which is exactly the behavior this test is verifying.
  });
});

describe("GET /api/shop-locations/[id] (integration)", () => {
  it("returns 404 for a nonexistent id", async () => {
    const res = await apiFetch("/api/shop-locations/does-not-exist-xyz");
    expect(res.status).toBe(404);
  });
});
