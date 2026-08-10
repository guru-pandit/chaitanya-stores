// @vitest-environment node
//
// Phase 1D — concurrency / race-condition tests against the live audit
// server (see docs/audit/phase0-attack-surface.md). These are integration
// tests over real HTTP + a real Postgres instance, not unit tests: they
// fire genuinely concurrent requests with Promise.all and inspect the
// resulting DB-visible state afterward.
//
// Primary targets called out in Phase 0:
//   - ShopLocation.isPrimary  ("exactly one primary", app-level $transaction only)
//   - FestivalBanner.isActive ("at most one active", app-level $transaction only)
//   - products/generate-sku  (race-prone SKU suffix generation)
//   - concurrent product creates with the same slug
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  BASE_URL,
  loginAsAdmin,
  authHeaders,
  randomSuffix,
  validShopLocationPayload,
  validFestivalBannerPayload,
  validProductPayload,
  getFirstCategoryId,
} from "./helpers";

let cookie: string;
let categoryId: string;

beforeAll(async () => {
  cookie = await loginAsAdmin();
  categoryId = await getFirstCategoryId(cookie);
});

// This suite deliberately provokes the "N rows end up primary/active"
// bugs documented below, which leaves the shared audit DB in a state
// that violates the app's own invariant (>1 primary shop location, or
// >1 active banner). Other Phase 1 agents share this DB, so restore a
// single-primary / single-or-zero-active state afterward via ordinary
// (non-concurrent, so race-free) API calls — never raw SQL.
async function restoreSinglePrimaryShopLocation() {
  const listRes = await fetch(`${BASE_URL}/api/shop-locations?limit=200`, { headers: authHeaders(cookie) });
  const { items } = (await listRes.json()) as {
    items: { id: string; isPrimary: boolean; name: string; address: string; phone: string; whatsappNumber: string; email: string }[];
  };
  const primaries = items.filter((i) => i.isPrimary);
  if (primaries.length <= 1) return;
  // Sequential (non-concurrent) PATCHes are race-free: each one fully
  // completes its own updateMany(false)+update(true) transaction before
  // the next starts, so the last one wins cleanly. Preserve each row's
  // own fields — only re-assert isPrimary — so we don't clobber other
  // agents' fixture data.
  for (const p of primaries) {
    await fetch(`${BASE_URL}/api/shop-locations/${p.id}`, {
      method: "PATCH",
      headers: authHeaders(cookie),
      body: JSON.stringify({
        name: p.name,
        address: p.address,
        phone: p.phone,
        whatsappNumber: p.whatsappNumber,
        email: p.email,
        isPrimary: true,
      }),
    });
  }
}

async function restoreAtMostOneActiveBanner() {
  const listRes = await fetch(`${BASE_URL}/api/festival-banners?limit=200`, { headers: authHeaders(cookie) });
  const { items } = (await listRes.json()) as {
    items: { id: string; isActive: boolean; label: string; mediaType: string; mediaPath: string }[];
  };
  const actives = items.filter((i) => i.isActive);
  if (actives.length <= 1) return;
  // Deactivate all but one, sequentially (race-free), preserving each
  // row's own fields.
  for (const a of actives.slice(1)) {
    await fetch(`${BASE_URL}/api/festival-banners/${a.id}`, {
      method: "PATCH",
      headers: authHeaders(cookie),
      body: JSON.stringify({
        label: a.label,
        mediaType: a.mediaType,
        mediaPath: a.mediaPath,
        isActive: false,
        startDate: "",
        endDate: "",
      }),
    });
  }
}

describe("concurrency: ShopLocation.isPrimary invariant", () => {
  afterAll(restoreSinglePrimaryShopLocation);

  it(
    "fires N concurrent POSTs each claiming isPrimary:true and checks how many rows end up primary",
    async () => {
      const N = 6;
      const requests = Array.from({ length: N }, () =>
        fetch(`${BASE_URL}/api/shop-locations`, {
          method: "POST",
          headers: authHeaders(cookie),
          body: JSON.stringify(validShopLocationPayload({ isPrimary: true })),
        })
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // Phase 4 fix (finding #12): "exactly one primary" is now enforced by
      // a Postgres partial unique index (see the
      // 20260806120000_enforce_single_primary_and_active migration), not
      // just the application-level $transaction. A concurrent request that
      // loses the race to the unique index gets a clean 409 (the API
      // catches the P2002/P2034 and translates it), never a raw 500, and
      // never silently succeeds into a second primary row.
      //
      // The HTTP-response split isn't asserted as an exact 1-success/
      // (N-1)-conflict count: if the requests don't land perfectly
      // simultaneously, a later one can genuinely start (and win) its own
      // transaction after an earlier one has already committed and
      // released its lock — more than one 201 is legitimate as long as the
      // DB-visible end state below still has exactly one primary. That
      // primaryCount check, not the status-code split, is the actual
      // invariant this test protects.
      expect(statuses).not.toContain(500);
      expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);

      const listRes = await fetch(`${BASE_URL}/api/shop-locations?limit=100`, {
        headers: authHeaders(cookie),
      });
      const { items } = (await listRes.json()) as { items: { isPrimary: boolean }[] };
      const primaryCount = items.filter((i) => i.isPrimary).length;

      // The DB-level constraint makes this genuinely guaranteed now, not
      // just intended — see the migration comment for why the app-level
      // $transaction alone couldn't serialize this under READ COMMITTED.
      expect(primaryCount).toBe(1);
    },
    30_000
  );

  it(
    "fires N concurrent PATCHes on distinct existing rows each claiming isPrimary:true",
    async () => {
      // Seed N non-primary rows first (sequentially, to isolate the race
      // to the PATCH step only).
      const N = 5;
      const ids: string[] = [];
      for (let i = 0; i < N; i++) {
        const res = await fetch(`${BASE_URL}/api/shop-locations`, {
          method: "POST",
          headers: authHeaders(cookie),
          body: JSON.stringify(validShopLocationPayload({ isPrimary: false })),
        });
        const body = (await res.json()) as { id: string };
        ids.push(body.id);
      }

      const requests = ids.map((id) =>
        fetch(`${BASE_URL}/api/shop-locations/${id}`, {
          method: "PATCH",
          headers: authHeaders(cookie),
          body: JSON.stringify(validShopLocationPayload({ isPrimary: true })),
        })
      );
      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // Same DB-level enforcement as the POST test above (finding #12), and
      // same reasoning for not asserting an exact status-code split — see
      // that test's comment. primaryCount below is the hard invariant.
      expect(statuses).not.toContain(500);
      expect(statuses.filter((s) => s === 200).length).toBeGreaterThanOrEqual(1);

      const listRes = await fetch(`${BASE_URL}/api/shop-locations?limit=100`, {
        headers: authHeaders(cookie),
      });
      const { items } = (await listRes.json()) as { items: { id: string; isPrimary: boolean }[] };
      const primaryCount = items.filter((i) => i.isPrimary).length;

      expect(primaryCount).toBe(1);
    },
    30_000
  );
});

describe("concurrency: FestivalBanner.isActive invariant", () => {
  afterAll(restoreAtMostOneActiveBanner);

  it(
    "fires N concurrent POSTs each claiming isActive:true and checks how many rows end up active",
    async () => {
      const N = 6;
      const requests = Array.from({ length: N }, () =>
        fetch(`${BASE_URL}/api/festival-banners`, {
          method: "POST",
          headers: authHeaders(cookie),
          body: JSON.stringify(validFestivalBannerPayload({ isActive: true })),
        })
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // Same DB-level enforcement as ShopLocation.isPrimary (finding #13),
      // and same reasoning for not asserting an exact status-code split —
      // see that describe block's comment. activeCount below is the hard
      // invariant.
      expect(statuses).not.toContain(500);
      expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);

      const listRes = await fetch(`${BASE_URL}/api/festival-banners?limit=100`, {
        headers: authHeaders(cookie),
      });
      const { items } = (await listRes.json()) as { items: { isActive: boolean }[] };
      const activeCount = items.filter((i) => i.isActive).length;

      expect(activeCount).toBe(1);
    },
    30_000
  );
});

describe("concurrency: product slug uniqueness", () => {
  it("two concurrent creates with the same slug — exactly one 201, the other a clean 4xx (not 500)", async () => {
    const sharedSlug = `race-slug-${randomSuffix()}`;
    const payloadA = validProductPayload(categoryId, { slug: sharedSlug });
    const payloadB = validProductPayload(categoryId, { slug: sharedSlug }); // different sku (randomSuffix differs per call)

    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: authHeaders(cookie),
        body: JSON.stringify(payloadA),
      }),
      fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: authHeaders(cookie),
        body: JSON.stringify(payloadB),
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
     
    console.log(`[concurrency] concurrent same-slug product creates -> statuses: ${statuses.join(", ")}`);

    // Neither response should ever be a raw 500 (unhandled DB error
    // leaking to the client) — the route wraps create() in a try/catch
    // for Prisma P2002 and returns a field-scoped 409 in that case.
    expect(statuses).not.toContain(500);

    const successCount = statuses.filter((s) => s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409 || s === 400).length;
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(1);
  });
});

describe("concurrency: products/generate-sku suffix race", () => {
  it("two concurrent GETs with the same brand+category can return the same suggested SKU", async () => {
    const brand = `RaceBrand${randomSuffix()}`;

    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/products/generate-sku?brand=${encodeURIComponent(brand)}&categoryId=${categoryId}`, {
        headers: authHeaders(cookie),
      }),
      fetch(`${BASE_URL}/api/products/generate-sku?brand=${encodeURIComponent(brand)}&categoryId=${categoryId}`, {
        headers: authHeaders(cookie),
      }),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const { sku: skuA } = (await resA.json()) as { sku: string };
    const { sku: skuB } = (await resB.json()) as { sku: string };

     
    console.log(`[concurrency] generate-sku race: skuA=${skuA} skuB=${skuB} (same brand/category, both new)`);

    // generate-sku is a pure read (no row reserved/locked), so two
    // concurrent callers with a brand new brand+category combo are
    // expected to both compute the same "first" suffix. This is a
    // documented low-severity UX race, NOT a data-integrity bug by
    // itself — it only matters if both callers then try to create a
    // product with that SKU, which is covered by the next test.
    expect(skuA).toBe(skuB);

    // Now prove the actual data-integrity boundary: two concurrent
    // product creates using that same suggested SKU (with distinct
    // slugs) must not both succeed, and must not raw-500.
    const payloadA = validProductPayload(categoryId, { sku: skuA, brand });
    const payloadB = validProductPayload(categoryId, { sku: skuA, brand });

    const [createA, createB] = await Promise.all([
      fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: authHeaders(cookie),
        body: JSON.stringify(payloadA),
      }),
      fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: authHeaders(cookie),
        body: JSON.stringify(payloadB),
      }),
    ]);

    const statuses = [createA.status, createB.status].sort();
     
    console.log(`[concurrency] concurrent same-SKU (from generate-sku race) creates -> statuses: ${statuses.join(", ")}`);

    expect(statuses).not.toContain(500);
    expect(statuses.filter((s) => s === 201).length).toBe(1);
    expect(statuses.filter((s) => s === 409 || s === 400).length).toBe(1);
  });
});

describe("concurrency: product PATCH slug/sku conflict (P2002 caught, mirrors POST)", () => {
  it("two concurrent PATCHes racing to claim the same new slug on different products", async () => {
    // Seed two distinct products first.
    const createA = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: authHeaders(cookie),
      body: JSON.stringify(validProductPayload(categoryId)),
    });
    const createB = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: authHeaders(cookie),
      body: JSON.stringify(validProductPayload(categoryId)),
    });
    const productA = (await createA.json()) as { id: string; sku: string };
    const productB = (await createB.json()) as { id: string; sku: string };

    const targetSlug = `race-patch-slug-${randomSuffix()}`;
    const patchPayloadA = validProductPayload(categoryId, { slug: targetSlug, sku: productA.sku });
    const patchPayloadB = validProductPayload(categoryId, { slug: targetSlug, sku: productB.sku });

    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/products/${productA.id}`, {
        method: "PATCH",
        headers: authHeaders(cookie),
        body: JSON.stringify(patchPayloadA),
      }),
      fetch(`${BASE_URL}/api/products/${productB.id}`, {
        method: "PATCH",
        headers: authHeaders(cookie),
        body: JSON.stringify(patchPayloadB),
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();

    console.log(`[concurrency] concurrent PATCH-to-same-slug (different products) -> statuses: ${statuses.join(", ")}`);

    // Phase 4 fix (finding #14): PATCH /api/products/[id] now wraps its
    // update in the same P2002 try/catch POST already had — a slug race
    // that slips past the pre-check surfaces as a clean field-scoped 409,
    // never a raw 500.
    expect(statuses).not.toContain(500);
    expect(statuses.filter((s) => s === 200).length).toBe(1);
    expect(statuses.filter((s) => s === 409).length).toBe(1);
  });
});
