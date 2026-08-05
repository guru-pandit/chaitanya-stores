// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

let seededProductId: string;
let categoryId: string;

beforeAll(async () => {
  const catRes = await apiFetch("/api/categories?limit=100");
  categoryId = (await catRes.json()).items[0].id;

  const prodRes = await apiFetch("/api/products?limit=100");
  const body = await prodRes.json();
  const sandalwood = body.items.find((p: { slug: string }) => p.slug === "sandalwood-agarbatti");
  if (!sandalwood) {
    throw new Error("Seeded 'sandalwood-agarbatti' product not found — expected the standard seed.");
  }
  seededProductId = sandalwood.id;
});

describe("GET /api/products/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/products/anything", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent id", async () => {
    const res = await apiFetch("/api/products/does-not-exist-xyz");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 200 with category + variants for a valid id", async () => {
    const res = await apiFetch(`/api/products/${seededProductId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("sandalwood-agarbatti");
    expect(body).toHaveProperty("category");
    expect(body).toHaveProperty("variants");
    expect(body.variants.length).toBeGreaterThan(0); // seed gives it 3 variants
  });
});

describe("PATCH /api/products/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson(
      `/api/products/${seededProductId}`,
      { name: "x" },
      { method: "PATCH" },
      { auth: false }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await apiJson(
      `/api/products/${seededProductId}`,
      { name: "" },
      { method: "PATCH" }
    );
    expect(res.status).toBe(400);
  });

  // BUG repro — mirrors the categories/[id] finding: PATCH does a slug/sku
  // conflict pre-check (findFirst, both no-op for a nonexistent id) and then
  // calls prisma.product.update() inside a $transaction with no prior
  // existence check. Prisma throws P2025 for the missing row, uncaught, so
  // this escapes as a raw 500 instead of the 404 GET/DELETE-style routes use.
  it("BUG: returns 500 (not 404) for a nonexistent id", async () => {
    const res = await apiJson(
      "/api/products/does-not-exist-xyz",
      {
        name: "X",
        slug: unique("nope"),
        description: "",
        brand: "B",
        weight: "",
        productType: "",
        sku: unique("NOPE-SKU").toUpperCase(),
        price: 100,
        images: [],
        inStock: true,
        featured: false,
        categoryId,
        variants: [],
      },
      { method: "PATCH" }
    );
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/products/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch(`/api/products/${seededProductId}`, { method: "DELETE" }, { auth: false });
    expect(res.status).toBe(401);
  });

  // BUG repro: DELETE calls prisma.product.delete({ where: { id } })
  // unconditionally, same missing-existence-check pattern as categories/[id].
  it("BUG: returns 500 (not 404) for a nonexistent id", async () => {
    const res = await apiFetch("/api/products/does-not-exist-xyz-delete", { method: "DELETE" });
    expect(res.status).toBe(500);
  });
});
