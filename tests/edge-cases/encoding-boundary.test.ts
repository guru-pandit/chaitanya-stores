// @vitest-environment node
//
// Phase 1D — encoding / internationalization / boundary-string tests
// against the live audit server. Covers Category and Product name/
// description fields: emoji, Devanagari, RTL Arabic, Zod max-length
// boundary (at limit / one over), empty-string-where-min(1)-required, and
// SQL-metacharacter-heavy strings (to confirm Prisma parameterization
// holds — expect inert storage, not errors or injection).
import { describe, it, expect, beforeAll } from "vitest";
import { BASE_URL, loginAsAdmin, authHeaders, randomSuffix, validProductPayload, getFirstCategoryId } from "./helpers";

let cookie: string;
let categoryId: string;

beforeAll(async () => {
  cookie = await loginAsAdmin();
  categoryId = await getFirstCategoryId(cookie);
});

async function createCategory(overrides: Record<string, unknown>) {
  const suffix = randomSuffix();
  const payload = {
    name: `Base Category ${suffix}`,
    slug: `base-category-${suffix}`,
    description: "base description",
    image: "",
    ...overrides,
  };
  const res = await fetch(`${BASE_URL}/api/categories`, {
    method: "POST",
    headers: authHeaders(cookie),
    body: JSON.stringify(payload),
  });
  return { res, payload };
}

describe("encoding: emoji / Unicode / RTL round-trip", () => {
  it("category name+description with emoji round-trips exactly", async () => {
    const name = `🪔 Diwali Diyas 🎉 ${randomSuffix()}`;
    const description = "Celebrate with 🔥 diyas and ✨ sparkles!";
    const { res, payload } = await createCategory({ name, description });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.name).toBe(payload.name);
    expect(created.description).toBe(payload.description);

    const getRes = await fetch(`${BASE_URL}/api/categories/${created.id}`, { headers: authHeaders(cookie) });
    const fetched = await getRes.json();
    expect(fetched.name).toBe(payload.name);
    expect(fetched.description).toBe(payload.description);
  });

  it("category name+description with Devanagari (Hindi) text round-trips exactly", async () => {
    const name = `अगरबत्ती चंदन ${randomSuffix()}`;
    const description = "शुद्ध चंदन की खुशबू वाली अगरबत्ती, रोज़ाना पूजा के लिए आदर्श।";
    const { res, payload } = await createCategory({ name, description });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.name).toBe(payload.name);
    expect(created.description).toBe(payload.description);
  });

  it("category name+description with RTL Arabic text round-trips exactly (no corruption/reordering)", async () => {
    const name = `بخور عربي فاخر ${randomSuffix()}`;
    const description = "بخور طبيعي 100% مصنوع يدويًا للاستخدام اليومي في الصلاة.";
    const { res, payload } = await createCategory({ name, description });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.name).toBe(payload.name);
    expect(created.description).toBe(payload.description);
  });

  it("product name+description with mixed Unicode (emoji + Devanagari + Arabic) round-trips exactly", async () => {
    const suffix = randomSuffix();
    const payload = validProductPayload(categoryId, {
      name: `🪔 अगरबत्ती بخور Mixed ${suffix}`,
      description: "Mixed script: हिन्दी + العربية + emoji 🎉",
    });
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: authHeaders(cookie),
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.name).toBe(payload.name);
    expect(created.description).toBe(payload.description);
  });
});

describe("boundary: Category.name max(100)", () => {
  it("exactly 100 chars is accepted", async () => {
    const name = "a".repeat(100);
    const { res } = await createCategory({ name });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.name.length).toBe(100);
  });

  it("101 chars (one over) is rejected with 400", async () => {
    const name = "a".repeat(101);
    const { res } = await createCategory({ name });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.fieldErrors?.name ?? body.error?.name).toBeTruthy();
  });
});

describe("boundary: Category.description max(1000)", () => {
  it("exactly 1000 chars is accepted", async () => {
    const description = "b".repeat(1000);
    const { res } = await createCategory({ description });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.description.length).toBe(1000);
  });

  it("1001 chars (one over) is rejected with 400", async () => {
    const description = "b".repeat(1001);
    const { res } = await createCategory({ description });
    expect(res.status).toBe(400);
  });
});

describe("boundary: Category.name min(1) — empty string rejected", () => {
  it("empty name is rejected with 400", async () => {
    const { res } = await createCategory({ name: "" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.fieldErrors?.name ?? body.error?.name).toBeTruthy();
  });
});

describe("SQL-metacharacter-heavy strings are stored/rendered as inert literal text", () => {
  it("a classic tautology-injection string in `name` is stored verbatim, not executed", async () => {
    const name = `' OR '1'='1 ${randomSuffix()}`;
    const { res, payload } = await createCategory({ name });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.name).toBe(payload.name);
  });

  it("a stacked-query injection string in `description` is stored verbatim, not executed", async () => {
    const description = `"; DROP TABLE products; --`;
    const { res, payload } = await createCategory({ description });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.description).toBe(payload.description);

    // Prove the products table is still intact (i.e. the string never
    // reached the DB as executable SQL — Prisma parameterizes all query
    // values).
    const productsRes = await fetch(`${BASE_URL}/api/products?limit=1`, { headers: authHeaders(cookie) });
    expect(productsRes.status).toBe(200);
    const productsBody = await productsRes.json();
    expect(productsBody).toHaveProperty("items");
    expect(productsBody).toHaveProperty("total");
  });

  it("SQL-metacharacter string used as a `q` search filter on public /api/products-adjacent GET does not error", async () => {
    // GET /api/products `q` param is raw (no Zod) per Phase 0 — confirm a
    // metacharacter-heavy search term is safely parameterized via
    // Prisma's `contains` and doesn't 500.
    const q = encodeURIComponent(`' OR '1'='1' --`);
    const res = await fetch(`${BASE_URL}/api/products?q=${q}`, { headers: authHeaders(cookie) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });
});
