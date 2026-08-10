import { describe, it, expect } from "vitest";
// This is Next's own path-matching engine (the same compiled module
// next/dist/server/lib/router-utils uses to resolve `redirects()` sources at
// request time) — using it here proves the actual per-segment matching
// behavior documented in the comment above `redirects()`, not just a
// hand-rolled assumption about how the strings behave.
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import nextConfig from "./next.config";

async function getRedirects() {
  const redirects = await nextConfig.redirects?.();
  if (!redirects) throw new Error("next.config.ts has no redirects() function");
  return redirects;
}

describe("next.config redirects — /products -> /catalog", () => {
  it("defines exactly the two expected permanent redirects", async () => {
    const redirects = await getRedirects();

    expect(redirects).toEqual([
      { source: "/products", destination: "/catalog", permanent: true },
      { source: "/products/:slug", destination: "/catalog/:slug", permanent: true },
    ]);
  });

  it("/products matches only the exact literal path, using Next's own path matcher", async () => {
    const redirects = await getRedirects();
    const rule = redirects.find((r) => r.source === "/products")!;
    const matcher = pathToRegexp(rule.source);

    expect(matcher.test("/products")).toBe(true);
    expect(matcher.test("/products/")).toBe(true);
  });

  it("/products does NOT match /api/products, /admin/products, or /products-foo", async () => {
    const redirects = await getRedirects();
    const rule = redirects.find((r) => r.source === "/products")!;
    const matcher = pathToRegexp(rule.source);

    expect(matcher.test("/api/products")).toBe(false);
    expect(matcher.test("/admin/products")).toBe(false);
    expect(matcher.test("/products-foo")).toBe(false);
    expect(matcher.test("/products/sandalwood-agarbatti")).toBe(false);
  });

  it("/products/:slug matches a single product slug segment", async () => {
    const redirects = await getRedirects();
    const rule = redirects.find((r) => r.source === "/products/:slug")!;
    const matcher = pathToRegexp(rule.source);

    expect(matcher.test("/products/sandalwood-agarbatti")).toBe(true);
  });

  it("/products/:slug does NOT match /api/products/:id or /admin/products/:id/edit", async () => {
    const redirects = await getRedirects();
    const rule = redirects.find((r) => r.source === "/products/:slug")!;
    const matcher = pathToRegexp(rule.source);

    expect(matcher.test("/api/products/abc123")).toBe(false);
    expect(matcher.test("/admin/products/abc123/edit")).toBe(false);
    // Multi-segment paths past the single :slug segment shouldn't match either.
    expect(matcher.test("/products/abc123/edit")).toBe(false);
  });

  it("both rules are permanent (308) redirects, not temporary — this is a real route rename, not an A/B test", async () => {
    const redirects = await getRedirects();
    for (const rule of redirects) {
      expect(rule.permanent).toBe(true);
    }
  });
});
