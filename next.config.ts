import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker deploy — copies only the files the
  // production server needs into .next/standalone (see Dockerfile) instead
  // of shipping the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
