import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { verifyCsrf } from "./csrf";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

function requestWith(headers: Record<string, string>) {
  // A real incoming request always carries a Host header (nginx pins it via
  // `proxy_set_header Host $host`) — verifyCsrf reads that directly rather
  // than `req.nextUrl.host` (see csrf.ts's comment on why), so the test
  // fixture must include one too, or every "same-origin" case below would
  // only pass via the NEXT_PUBLIC_SITE_URL fallback instead of exercising
  // the request-derived path.
  return new NextRequest("http://localhost:3000/api/products", {
    method: "POST",
    headers: { host: "localhost:3000", ...headers },
  });
}

describe("verifyCsrf", () => {
  it("allows a request with neither Origin nor Referer (non-browser clients)", () => {
    expect(verifyCsrf(requestWith({}))).toBeNull();
  });

  it("allows a same-origin request via Origin", () => {
    expect(verifyCsrf(requestWith({ origin: "http://localhost:3000" }))).toBeNull();
  });

  it("allows a same-origin request via Referer when Origin is absent", () => {
    expect(
      verifyCsrf(requestWith({ referer: "http://localhost:3000/admin/products/new" }))
    ).toBeNull();
  });

  it("rejects a cross-origin request with a 403 and a generic body", async () => {
    const res = verifyCsrf(requestWith({ origin: "https://evil.example.com" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body).toEqual({ error: "Forbidden" });
    // Never echo the rejected origin back to the caller.
    expect(JSON.stringify(body)).not.toContain("evil.example.com");
  });

  it("rejects an unparsable Origin value", () => {
    const res = verifyCsrf(requestWith({ origin: "not-a-url" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("prefers Origin over Referer when both are present", () => {
    const res = verifyCsrf(
      requestWith({ origin: "https://evil.example.com", referer: "http://localhost:3000/" })
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("allows a request from the configured NEXT_PUBLIC_SITE_URL host even if it differs from the request host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://chaitanyastores.example";
    expect(verifyCsrf(requestWith({ origin: "https://chaitanyastores.example" }))).toBeNull();
  });

  it("allows the www-variant of the configured NEXT_PUBLIC_SITE_URL host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://chaitanyastores.example";
    expect(verifyCsrf(requestWith({ origin: "https://www.chaitanyastores.example" }))).toBeNull();
  });

  it("allows the bare-domain variant when NEXT_PUBLIC_SITE_URL is configured with www", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.chaitanyastores.example";
    expect(verifyCsrf(requestWith({ origin: "https://chaitanyastores.example" }))).toBeNull();
  });

  it("still rejects a genuinely unrelated origin even with NEXT_PUBLIC_SITE_URL configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://chaitanyastores.example";
    const res = verifyCsrf(requestWith({ origin: "https://attacker.example" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  // Regression test for the standalone-Docker-build bug: `req.nextUrl.host`
  // is derived from HOSTNAME/PORT there ("0.0.0.0:3000"), not the real
  // inbound Host header, so a request-derived allow-list entry built from
  // `nextUrl.host` would never match the real public hostname in
  // production. The Host header itself (which nginx pins) must be what's
  // trusted instead.
  it("trusts the Host header even when the request URL's own host would be wrong (standalone-build shape)", () => {
    const req = new NextRequest("http://0.0.0.0:3000/api/products", {
      method: "POST",
      headers: { host: "chaitanyastores.com", origin: "https://chaitanyastores.com" },
    });
    expect(verifyCsrf(req)).toBeNull();
  });
});
