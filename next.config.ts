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
};

export default nextConfig;
