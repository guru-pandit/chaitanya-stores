// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

let categoryId: string;
const createdIds: string[] = [];

beforeAll(async () => {
  const res = await apiFetch("/api/categories?limit=100");
  const body = await res.json();
  categoryId = body.items[0].id;
});

afterAll(async () => {
  for (const id of createdIds) {
    await apiFetch(`/api/products/${id}`, { method: "DELETE" }).catch(() => {});
  }
});

function validProductBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Integration Test Product",
    slug: unique("integration-product"),
    description: "",
    brand: "IntegrationBrand",
    weight: "",
    productType: "",
    sku: unique("INT-SKU").toUpperCase(),
    price: 5000,
    images: [],
    inStock: true,
    featured: false,
    categoryId,
    variants: [],
    ...overrides,
  };
}

describe("GET /api/products (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/products", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns a paginated { items, total } shape with category + variants included", async () => {
    const res = await apiFetch("/api/products?limit=100");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(8); // 8 seeded products
    expect(body.items[0]).toHaveProperty("category");
    expect(body.items[0]).toHaveProperty("variants");
  });

  it("filters by categoryId", async () => {
    const res = await apiFetch(`/api/products?categoryId=${categoryId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.every((p: { categoryId: string }) => p.categoryId === categoryId)).toBe(true);
  });

  it("filters by brand", async () => {
    const res = await apiFetch("/api/products?brand=Cycle");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.every((p: { brand: string }) => p.brand === "Cycle")).toBe(true);
  });

  it("filters by q (contains, case-insensitive-by-default depends on collation)", async () => {
    const res = await apiFetch("/api/products?q=Sandalwood");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.some((p: { name: string }) => p.name.includes("Sandalwood"))).toBe(true);
  });

  it("respects limit pagination", async () => {
    const res = await apiFetch("/api/products?limit=2");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(2);
  });
});

describe("POST /api/products (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson("/api/products", validProductBody(), {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body (missing sku)", async () => {
    const res = await apiJson("/api/products", validProductBody({ sku: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.sku).toBeDefined();
  });

  it("returns 400 when price is not a positive integer", async () => {
    const res = await apiJson("/api/products", validProductBody({ price: -5 }));
    expect(res.status).toBe(400);
  });

  it("returns a clean 400 (not 500) on malformed JSON", async () => {
    const res = await apiFetch("/api/products", { method: "POST", body: "{oops" });
    expect(res.status).toBe(400);
  });

  it("creates (201), persists via GET, PATCH updates persist, DELETE then 404", async () => {
    const body = validProductBody();
    const createRes = await apiJson("/api/products", body);
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created).toMatchObject({ name: body.name, slug: body.slug, sku: body.sku });
    createdIds.push(created.id);

    const getRes = await apiFetch(`/api/products/${created.id}`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).sku).toBe(body.sku);

    const patchRes = await apiJson(
      `/api/products/${created.id}`,
      { ...body, name: "Renamed Integration Product" },
      { method: "PATCH" }
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).name).toBe("Renamed Integration Product");

    const getAfterPatch = await apiFetch(`/api/products/${created.id}`);
    expect((await getAfterPatch.json()).name).toBe("Renamed Integration Product");

    const deleteRes = await apiFetch(`/api/products/${created.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);

    const getAfterDelete = await apiFetch(`/api/products/${created.id}`);
    expect(getAfterDelete.status).toBe(404);
  });

  it("creates with variants and persists them", async () => {
    const body = validProductBody({
      variants: [
        { label: "Small", price: 1000, inStock: true },
        { label: "Large", price: 2000, inStock: false },
      ],
    });
    const res = await apiJson("/api/products", body);
    expect(res.status).toBe(201);
    const created = await res.json();
    createdIds.push(created.id);
    expect(created.variants).toHaveLength(2);
  });

  it("returns 409 when the slug is already in use", async () => {
    const body = validProductBody();
    const first = await apiJson("/api/products", body);
    expect(first.status).toBe(201);
    const created = await first.json();
    createdIds.push(created.id);

    const dup = await apiJson("/api/products", { ...body, sku: unique("OTHER-SKU").toUpperCase() });
    expect(dup.status).toBe(409);
    const dupBody = await dup.json();
    expect(dupBody.error.fieldErrors.slug).toBeDefined();
  });

  it("returns 409 when the sku is already in use", async () => {
    const body = validProductBody();
    const first = await apiJson("/api/products", body);
    expect(first.status).toBe(201);
    const created = await first.json();
    createdIds.push(created.id);

    const dup = await apiJson("/api/products", { ...body, slug: unique("other-slug") });
    expect(dup.status).toBe(409);
    const dupBody = await dup.json();
    expect(dupBody.error.fieldErrors.sku).toBeDefined();
  });

  // BUG repro: productSchema.categoryId is only checked as a non-empty
  // string (see docs/audit/phase0-attack-surface.md §4) — it's never
  // validated as an existing Category id. Prisma then rejects the insert
  // with a foreign-key constraint violation (P2002/P2003) that isn't caught
  // anywhere in POST /api/products, so it escapes as a raw 500 instead of a
  // clean 400/404.
  it("BUG: returns 500 (not a clean 400/404) when categoryId does not exist", async () => {
    const res = await apiJson("/api/products", validProductBody({ categoryId: "does-not-exist-xyz" }));
    expect(res.status).toBe(500);
  });
});
