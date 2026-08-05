// @vitest-environment node
import { describe, it, expect } from "vitest";
import { TEST_BASE_URL } from "@/test/apiIntegrationHelpers";

// Deliberately does NOT reuse the shared getAuthCookie() cache from
// apiIntegrationHelpers — this file exercises the login flow itself. Only
// ONE bad-password attempt is made below (never repeated) to avoid tripping
// src/lib/login-throttle.ts's 5-attempt lockout for the shared admin email,
// which every other *.integration.test.ts file's beforeAll depends on
// against this same long-running dev server process.
const ADMIN_EMAIL = process.env.AUDIT_ADMIN_EMAIL ?? "audit-admin@chaitanyastores.example";
const ADMIN_PASSWORD = process.env.AUDIT_ADMIN_PASSWORD ?? "AuditPass!2026Test";

async function getCsrf() {
  const res = await fetch(`${TEST_BASE_URL}/api/auth/csrf`);
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  return { csrfToken, cookieHeader: cookies.join("; ") };
}

describe("GET /api/auth/csrf (integration)", () => {
  it("returns 200 with a csrfToken, no auth required", async () => {
    const res = await fetch(`${TEST_BASE_URL}/api/auth/csrf`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/callback/credentials (integration)", () => {
  it("issues a session cookie for correct admin credentials", async () => {
    const { csrfToken, cookieHeader } = await getCsrf();
    const res = await fetch(`${TEST_BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader },
      body: new URLSearchParams({
        csrfToken,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        redirect: "false",
        json: "true",
      }).toString(),
      redirect: "manual",
    });
    const sessionCookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("authjs.session-token="));
    expect(sessionCookie).toBeDefined();
  });

  it("does NOT issue a session cookie for a wrong password (single attempt — see file header)", async () => {
    const { csrfToken, cookieHeader } = await getCsrf();
    const res = await fetch(`${TEST_BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader },
      body: new URLSearchParams({
        csrfToken,
        email: ADMIN_EMAIL,
        password: "definitely-the-wrong-password",
        redirect: "false",
        json: "true",
      }).toString(),
      redirect: "manual",
    });
    const sessionCookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("authjs.session-token="));
    expect(sessionCookie).toBeUndefined();
  });
});
