// @vitest-environment node
//
// Phase 1D — state-machine / stale-auth edge cases against the live audit
// server. Covers: corrupted session cookie, valid-but-reused JWT session
// (expected NextAuth JWT behavior, not a bug), and PATCH on a
// non-existent resource id.
import { describe, it, expect, beforeAll } from "vitest";
import { BASE_URL, loginAsAdmin, authHeaders } from "./helpers";

let cookie: string;

beforeAll(async () => {
  cookie = await loginAsAdmin();
});

describe("stale / corrupted session handling", () => {
  it("a session cookie with a corrupted signature yields a clean 401, not a 500", async () => {
    // Flip a run of characters in the middle of the JWE so the signature/
    // encryption no longer verifies, without producing a structurally
    // invalid (unparseable-as-JWE) token.
    const corrupted = cookie.slice(0, -20) + "XXXXXXXXXXXXXXXXXXXX";

    const res = await fetch(`${BASE_URL}/api/shop-locations`, {
      headers: authHeaders(corrupted),
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("a truncated/garbage cookie value yields a clean 401, not a 500", async () => {
    const res = await fetch(`${BASE_URL}/api/shop-locations`, {
      headers: authHeaders("authjs.session-token=not-a-real-jwt-at-all"),
    });
    expect(res.status).toBe(401);
  });

  it("no cookie at all yields a clean 401", async () => {
    const res = await fetch(`${BASE_URL}/api/shop-locations`);
    expect(res.status).toBe(401);
  });

  it(
    "a valid session cookie from a completed prior login still works on replay " +
      "(expected: NextAuth JWT sessions are stateless — there is no server-side " +
      "invalidation list, so this is NOT a bug, just documenting the behavior)",
    async () => {
      const res = await fetch(`${BASE_URL}/api/shop-locations`, {
        headers: authHeaders(cookie),
      });
      expect(res.status).toBe(200);
    }
  );
});

describe("PATCH /api/enquiries/[id] on a non-existent id", () => {
  it("a well-formed but non-existent cuid-shaped id returns a clean 404, not 500", async () => {
    // Same shape/length as a real Prisma cuid, but not one that exists.
    const fakeId = "cly0000000000000000000000";
    const res = await fetch(`${BASE_URL}/api/enquiries/${fakeId}`, {
      method: "PATCH",
      headers: authHeaders(cookie),
      body: JSON.stringify({ isCompleted: true }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("a garbage (non-cuid-shaped) id also returns a clean 404, not 500", async () => {
    const res = await fetch(`${BASE_URL}/api/enquiries/${encodeURIComponent("../../etc/passwd")}`, {
      method: "PATCH",
      headers: authHeaders(cookie),
      body: JSON.stringify({ isCompleted: true }),
    });
    expect([404, 400]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("malformed body on an existing-shaped id still fails validation (400) before the 404 path", async () => {
    const fakeId = "cly0000000000000000000001";
    const res = await fetch(`${BASE_URL}/api/enquiries/${fakeId}`, {
      method: "PATCH",
      headers: authHeaders(cookie),
      body: JSON.stringify({ isCompleted: "not-a-boolean" }),
    });
    expect(res.status).toBe(400);
  });
});
