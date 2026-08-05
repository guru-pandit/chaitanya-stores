// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

let seededCategoryWithProductsId: string;

beforeAll(async () => {
  const res = await apiFetch("/api/categories?limit=100");
  const body = await res.json();
  const incense = body.items.find((c: { slug: string }) => c.slug === "incense-sticks");
  if (!incense) {
    throw new Error(
      "Seeded 'incense-sticks' category not found — expected the standard 4-category/8-product seed."
    );
  }
  seededCategoryWithProductsId = incense.id;
});

describe("GET /api/categories/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/categories/anything", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent id", async () => {
    const res = await apiFetch("/api/categories/does-not-exist-xyz");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 200 with the category for a valid id", async () => {
    const res = await apiFetch(`/api/categories/${seededCategoryWithProductsId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("incense-sticks");
  });
});

describe("DELETE /api/categories/[id] blocked when products reference it (integration)", () => {
  it("returns 409 when the category still has products", async () => {
    const res = await apiFetch(`/api/categories/${seededCategoryWithProductsId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/product/i);

    // Confirm it genuinely wasn't deleted.
    const stillThere = await apiFetch(`/api/categories/${seededCategoryWithProductsId}`);
    expect(stillThere.status).toBe(200);
  });
});

describe("BUG repro: DELETE/PATCH /api/categories/[id] for a nonexistent id (integration)", () => {
  // src/app/api/categories/[id]/route.ts's DELETE handler counts referencing
  // products (0 for a nonexistent id) and then calls prisma.category.delete
  // unconditionally — Prisma throws P2025 ("Record to delete does not
  // exist"), which is never caught, so it escapes as an unhandled 500
  // instead of the 404 every other route in this app returns for a missing
  // id. Same shape of bug on PATCH (update() with no prior existence check).
  it("DELETE returns 500 instead of 404 for a nonexistent id", async () => {
    const res = await apiFetch("/api/categories/does-not-exist-xyz-delete", { method: "DELETE" });
    expect(res.status).toBe(500);
  });

  it("PATCH returns 500 instead of 404 for a nonexistent id", async () => {
    const res = await apiJson(
      "/api/categories/does-not-exist-xyz-patch",
      { name: "X", slug: unique("nope"), description: "", image: "" },
      { method: "PATCH" }
    );
    expect(res.status).toBe(500);
  });
});
