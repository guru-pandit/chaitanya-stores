// @vitest-environment node
import { describe, it, expect, afterAll } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

const createdIds: string[] = [];

afterAll(async () => {
  for (const id of createdIds) {
    await apiFetch(`/api/categories/${id}`, { method: "DELETE" }).catch(() => {});
  }
});

describe("GET /api/categories (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/categories", {}, { auth: false });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns a paginated { items, total } shape including seeded categories", async () => {
    const res = await apiFetch("/api/categories?limit=100");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.total).toBeGreaterThanOrEqual(4); // 4 seeded categories
    expect(body.items[0]).toHaveProperty("_count");
  });

  it("respects limit/page pagination params", async () => {
    const res = await apiFetch("/api/categories?page=1&limit=1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(1);
  });
});

describe("POST /api/categories (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson(
      "/api/categories",
      { name: "X", slug: unique("x-cat"), description: "", image: "" },
      {},
      { auth: false }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body (missing name)", async () => {
    const res = await apiJson("/api/categories", { slug: unique("no-name"), description: "" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.name).toBeDefined();
  });

  it("returns 400 when slug has invalid characters", async () => {
    const res = await apiJson("/api/categories", {
      name: "Bad Slug Category",
      slug: "Not A Valid Slug!",
      description: "",
    });
    expect(res.status).toBe(400);
  });

  it("creates and returns 201, then persists via GET, and PATCH persists an update", async () => {
    const slug = unique("integration-cat");
    const createRes = await apiJson("/api/categories", {
      name: "Integration Test Category",
      slug,
      description: "Created by API integration tests",
      image: "",
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created).toMatchObject({ name: "Integration Test Category", slug });
    createdIds.push(created.id);

    const getRes = await apiFetch(`/api/categories/${created.id}`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).slug).toBe(slug);

    const patchRes = await apiJson(
      `/api/categories/${created.id}`,
      { name: "Renamed Integration Category", slug, description: "", image: "" },
      { method: "PATCH" }
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).name).toBe("Renamed Integration Category");

    const getAfterPatch = await apiFetch(`/api/categories/${created.id}`);
    expect((await getAfterPatch.json()).name).toBe("Renamed Integration Category");

    const deleteRes = await apiFetch(`/api/categories/${created.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.json()).toEqual({ success: true });

    const getAfterDelete = await apiFetch(`/api/categories/${created.id}`);
    expect(getAfterDelete.status).toBe(404);
  });

  it("returns 409 when the slug is already in use", async () => {
    const slug = unique("dup-cat");
    const first = await apiJson("/api/categories", { name: "Dup A", slug, description: "", image: "" });
    expect(first.status).toBe(201);
    const created = await first.json();
    createdIds.push(created.id);

    const dup = await apiJson("/api/categories", { name: "Dup B", slug, description: "", image: "" });
    expect(dup.status).toBe(409);
    const body = await dup.json();
    expect(body.error.fieldErrors.slug).toBeDefined();
  });
});
