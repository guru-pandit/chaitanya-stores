import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { verifyCsrf } from "./csrf";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

function requestWith(headers: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/products", {
    method: "POST",
    headers,
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
});
