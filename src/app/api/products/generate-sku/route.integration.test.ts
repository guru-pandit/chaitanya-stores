// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch } from "@/test/apiIntegrationHelpers";

let categoryId: string;
let categoryName: string;

beforeAll(async () => {
  const res = await apiFetch("/api/categories?limit=100");
  const body = await res.json();
  const incense = body.items.find((c: { slug: string }) => c.slug === "incense-sticks");
  categoryId = incense.id;
  categoryName = incense.name;
});

describe("GET /api/products/generate-sku (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/products/generate-sku?brand=X&categoryId=y", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 400 when both brand and categoryId are missing", async () => {
    const res = await apiFetch("/api/products/generate-sku");
    expect(res.status).toBe(400);
  });

  it("returns 400 when only brand is present", async () => {
    const res = await apiFetch("/api/products/generate-sku?brand=Cycle");
    expect(res.status).toBe(400);
  });

  it("returns 400 when only categoryId is present", async () => {
    const res = await apiFetch(`/api/products/generate-sku?categoryId=${categoryId}`);
    expect(res.status).toBe(400);
  });

  it("returns 404 when categoryId does not reference a real category", async () => {
    const res = await apiFetch("/api/products/generate-sku?brand=Cycle&categoryId=does-not-exist-xyz");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Category not found" });
  });

  it("produces a plausible <BRAND3><CAT3>-NNNN SKU for a real brand + category", async () => {
    const res = await apiFetch(
      `/api/products/generate-sku?brand=${encodeURIComponent("TestBrand")}&categoryId=${categoryId}`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sku).toMatch(/^[A-Z]{1,3}-[A-Z]{1,3}-\d{4}$/);
    expect(body.sku.startsWith("TES-INC-")).toBe(true); // TestBrand -> TES, Incense Sticks -> INC
  });

  it("increments the numeric suffix past existing SKUs with the same prefix", async () => {
    const first = await apiFetch(
      `/api/products/generate-sku?brand=${encodeURIComponent("IncrementBrand")}&categoryId=${categoryId}`
    );
    const firstSku = (await first.json()).sku;

    // Create a product using that exact SKU so the next call must skip past it.
    const createRes = await apiFetch("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name: "SKU Increment Probe",
        slug: `sku-increment-probe-${Date.now()}`,
        description: "",
        brand: "IncrementBrand",
        weight: "",
        productType: "",
        sku: firstSku,
        price: 100,
        images: [],
        inStock: true,
        featured: false,
        categoryId,
        variants: [],
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const second = await apiFetch(
      `/api/products/generate-sku?brand=${encodeURIComponent("IncrementBrand")}&categoryId=${categoryId}`
    );
    const secondSku = (await second.json()).sku;
    expect(secondSku).not.toBe(firstSku);

    await apiFetch(`/api/products/${created.id}`, { method: "DELETE" });
  });

  it("brand/category name too short still produces a sane (short) prefix, not an error", async () => {
    const res = await apiFetch(`/api/products/generate-sku?brand=A&categoryId=${categoryId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sku).toMatch(/^A-[A-Z]{1,3}-\d{4}$/);
  });

  it("sanity: categoryName resolved for readability in prefix (not asserted structurally)", () => {
    expect(categoryName).toBe("Incense Sticks");
  });
});
