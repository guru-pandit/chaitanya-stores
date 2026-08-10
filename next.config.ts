import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker deploy — copies only the files the
  // production server needs into .next/standalone (see Dockerfile) instead
  // of shipping the full node_modules tree.
  output: "standalone",
  // Strips the `X-Powered-By: Next.js` response header — framework
  // fingerprinting with no functional benefit (Phase 4 audit finding #10;
  // not stripped by nginx today).
  poweredByHeader: false,
  // The public catalog route was renamed /products -> /catalog. These
  // sources are exact-segment matches (Next's redirects() path matching is
  // per-segment, not a string-prefix match), so "/products" only matches
  // the literal path "/products" — it does not match "/products-foo" or
  // "/api/products"/"/admin/products" (different path segments entirely).
  async redirects() {
    return [
      { source: "/products", destination: "/catalog", permanent: true },
      { source: "/products/:slug", destination: "/catalog/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
