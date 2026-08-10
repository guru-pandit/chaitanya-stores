// Shared helpers for the Phase 1D edge-case/concurrency/regression test
// suite. These tests hit a *live* running app server (see docs/audit/
// phase0-attack-surface.md) over plain `fetch` — they are not unit tests
// and do not mock Prisma/NextAuth. Point TEST_BASE_URL at any other running
// instance if needed; defaults to the local audit server.
export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3100";

const ADMIN_EMAIL = process.env.AUDIT_ADMIN_EMAIL ?? "audit-admin@chaitanyastores.example";
const ADMIN_PASSWORD = process.env.AUDIT_ADMIN_PASSWORD ?? "AuditPass!2026Test";

/**
 * Drives the real NextAuth Credentials flow (GET csrf -> POST callback)
 * exactly as the browser client would, and returns a `Cookie:` header
 * value carrying the resulting `authjs.session-token`. Throws if login
 * doesn't yield a session cookie, so a broken auth flow fails loudly
 * instead of every downstream test silently getting 401s.
 */
export async function loginAsAdmin(): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfCookies = csrfRes.headers.getSetCookie();
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookieHeader = csrfCookies.map((c) => c.split(";")[0]).join("; ");

  const body = new URLSearchParams({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    csrfToken,
    redirect: "false",
    json: "true",
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookieHeader,
    },
    body: body.toString(),
    redirect: "manual",
  });

  const loginCookies = loginRes.headers.getSetCookie();
  const sessionCookie = loginCookies.find((c) => c.includes("session-token"));
  if (!sessionCookie) {
    throw new Error(
      `Admin login failed — no session-token cookie in response (status ${loginRes.status}). ` +
        `Check AUDIT_ADMIN_EMAIL/AUDIT_ADMIN_PASSWORD and that the audit server is up.`
    );
  }
  return sessionCookie.split(";")[0];
}

export function authHeaders(cookie: string, extra: Record<string, string> = {}) {
  return { Cookie: cookie, "Content-Type": "application/json", ...extra };
}

export function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function validShopLocationPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: `Edge Shop ${randomSuffix()}`,
    address: "123 Test Street, Pune",
    phone: "9999999999",
    whatsappNumber: "919999999999",
    email: "shop@example.com",
    isPrimary: false,
    ...overrides,
  };
}

export function validFestivalBannerPayload(overrides: Record<string, unknown> = {}) {
  return {
    label: `Edge Banner ${randomSuffix()}`,
    mediaType: "IMAGE",
    mediaPath: "/uploads/does-not-need-to-exist-for-schema.png",
    isActive: false,
    startDate: "",
    endDate: "",
    ...overrides,
  };
}

export function validProductPayload(categoryId: string, overrides: Record<string, unknown> = {}) {
  const suffix = randomSuffix();
  return {
    name: `Edge Product ${suffix}`,
    slug: `edge-product-${suffix}`,
    description: "Test description",
    brand: "EdgeBrand",
    weight: "100g",
    productType: "Standard",
    sku: `EDGE-${suffix}`,
    price: 10000,
    images: [],
    inStock: true,
    featured: false,
    categoryId,
    variants: [],
    ...overrides,
  };
}

export function validCategoryPayload(overrides: Record<string, unknown> = {}) {
  const suffix = randomSuffix();
  return {
    name: `Edge Category ${suffix}`,
    slug: `edge-category-${suffix}`,
    description: "Test category description",
    image: "",
    ...overrides,
  };
}

export async function getFirstCategoryId(cookie: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/categories?limit=1`, { headers: authHeaders(cookie) });
  const body = (await res.json()) as { items: { id: string }[] };
  if (!body.items?.[0]?.id) {
    throw new Error("No categories found in the audit DB — expected seed data to be present.");
  }
  return body.items[0].id;
}
