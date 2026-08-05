// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

let seededEnquiryId: string;
let seededProductId: string;

beforeAll(async () => {
  const prodRes = await apiFetch("/api/products?limit=1");
  seededProductId = (await prodRes.json()).items[0].id;

  // Create an enquiry through the public contact endpoint referencing a real
  // product, so GET /api/enquiries has something to resolve product.name/slug
  // against.
  const contactRes = await apiJson(
    "/api/contact",
    {
      productId: seededProductId,
      name: unique("Enquiries Test"),
      contactMethod: "9999999999",
      message: "Integration test enquiry",
    },
    {},
    { auth: false }
  );
  seededEnquiryId = (await contactRes.json()).id;
});

describe("GET /api/enquiries (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/enquiries", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns a paginated { items, total } shape with resolved product info", async () => {
    const res = await apiFetch("/api/enquiries?limit=100");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");

    const mine = body.items.find((e: { id: string }) => e.id === seededEnquiryId);
    expect(mine).toBeDefined();
    expect(mine.product).toMatchObject({ id: seededProductId });
  });

  it("resolves product: null for an enquiry whose productId doesn't match any real product (loose FK gap)", async () => {
    // contactSchema.productId is optional and not validated against an
    // existing Product (phase0-attack-surface.md §4) — a bogus id is
    // accepted and simply resolves to product: null in the admin list.
    const contactRes = await apiJson(
      "/api/contact",
      {
        productId: "totally-made-up-product-id",
        name: unique("Bogus Product Ref"),
        contactMethod: "9999999999",
        message: "probe",
      },
      {},
      { auth: false }
    );
    expect(contactRes.status).toBe(201);
    const created = await contactRes.json();

    const res = await apiFetch("/api/enquiries?limit=100");
    const body = await res.json();
    const mine = body.items.find((e: { id: string }) => e.id === created.id);
    expect(mine.productId).toBe("totally-made-up-product-id");
    expect(mine.product).toBeNull();
  });

  it("respects limit pagination", async () => {
    const res = await apiFetch("/api/enquiries?limit=1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeLessThanOrEqual(1);
  });
});

describe("enquiries/[id] cross-check (full round trip)", () => {
  it("PATCH toggles isCompleted and GET /api/enquiries reflects it", async () => {
    const patchRes = await apiJson(
      `/api/enquiries/${seededEnquiryId}`,
      { isCompleted: true },
      { method: "PATCH" }
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).isCompleted).toBe(true);

    const listRes = await apiFetch("/api/enquiries?limit=100");
    const body = await listRes.json();
    const mine = body.items.find((e: { id: string }) => e.id === seededEnquiryId);
    expect(mine.isCompleted).toBe(true);
  });
});
