import { describe, it, expect } from "vitest";
import { authConfig } from "./auth.config";

// `authorized()` is the proxy-facing gate (src/proxy.ts matches
// ["/admin", "/admin/:path*"]) — it never touches Prisma/bcrypt, so it's a
// pure function of (session-present?, pathname) and safe to unit test
// without a DB.
function callAuthorized(opts: { loggedIn: boolean; pathname: string }) {
  const auth = opts.loggedIn
    ? { user: { id: "u1", email: "admin@example.com" }, expires: "2099-01-01T00:00:00.000Z" }
    : null;
  const nextUrl = new URL(`http://localhost:3000${opts.pathname}`);
  return authConfig.callbacks!.authorized!({
    auth,
    // Only `nextUrl` is read by the callback; cast rather than construct a full NextRequest.
    request: { nextUrl } as unknown as Parameters<
      NonNullable<NonNullable<typeof authConfig.callbacks>["authorized"]>
    >[0]["request"],
  });
}

describe("authConfig.callbacks.authorized", () => {
  it("denies access to a protected admin page when logged out", () => {
    expect(callAuthorized({ loggedIn: false, pathname: "/admin/dashboard" })).toBe(false);
  });

  it("allows access to a protected admin page when logged in", () => {
    expect(callAuthorized({ loggedIn: true, pathname: "/admin/dashboard" })).toBe(true);
  });

  it("passes through the login page when logged out (no redirect)", () => {
    expect(callAuthorized({ loggedIn: false, pathname: "/admin/login" })).toBe(true);
  });

  it("redirects away from the login page to the dashboard when already logged in", () => {
    const result = callAuthorized({ loggedIn: true, pathname: "/admin/login" });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBeGreaterThanOrEqual(300);
    expect((result as Response).status).toBeLessThan(400);
    expect((result as Response).headers.get("location")).toContain("/admin/dashboard");
  });

  it("denies any other protected admin subpath when logged out", () => {
    expect(callAuthorized({ loggedIn: false, pathname: "/admin/products/new" })).toBe(false);
  });
});

describe("authConfig — session strategy", () => {
  it("uses JWT session strategy (no DB session lookups on every request)", () => {
    expect(authConfig.session?.strategy).toBe("jwt");
  });

  it("points the sign-in page at /admin/login", () => {
    expect(authConfig.pages?.signIn).toBe("/admin/login");
  });
});
